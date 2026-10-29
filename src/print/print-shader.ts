export const PRINT_VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * One pass of the Photoshop recipe, evaluated per pixel in scene pixels so preview and
 * export show the same pattern:
 *  1. image luminance (+ brightness / contrast, then highlights / shadows)
 *  2. Grain adjustment: midtone-weighted noise (Amount, Size, Roughness)
 *  3. 50% grey texture: Halftone Pattern dots (Size, Contrast) embossed by Craquelure
 *     (Spacing, Depth, Brightness)
 *  4. Lighter Color blend of texture over image at Opacity (grey values, so the lighter one wins)
 *  5. Threshold (0..255) → ink below, paper above (the Gradient Map)
 */
export const PRINT_FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uRes;        // backing pixels
uniform float uScale;     // backing pixels per scene pixel
uniform vec4 uRect;       // image rect in scene pixels (x, y, w, h)
uniform sampler2D uImage;
uniform float uHasImage;
uniform float uBrightness, uContrast, uHighlights, uShadows;
uniform float uGrainAmount, uGrainSize, uGrainRough;
uniform float uDotSize, uDotContrast;
uniform float uCrackSpacing, uCrackDepth, uCrackBright;
uniform float uOpacity, uThreshold;
uniform vec3 uInk, uPaper;
uniform float uPaperFill;

out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Distance to the nearest Voronoi cell border (crack lines), in cell units.
float voronoiBorder(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  vec2 mg, mr;
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 r = g + hash22(n + g) - f;
    float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++)
  for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j));
    vec2 r = g + hash22(n + g) - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return md;
}

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Photoshop Grain: Size widens the grains, Roughness mixes in per-pixel speckle.
float grain(vec2 p) {
  float cell = 1.0 + uGrainSize / 100.0 * 3.0;
  // Value noise clusters around 0.5; stretch it so smooth and rough grain spread alike.
  float smoothN = clamp((vnoise(p / cell) * 0.65 + vnoise(p / cell * 2.03 + 17.0) * 0.35 - 0.5) * 2.6, -1.0, 1.0);
  float rough = hash12(floor(p) + 0.5) * 2.0 - 1.0;
  return mix(smoothN, rough, uGrainRough / 100.0);
}

// The 50% grey layer after Halftone Pattern + Craquelure, 0..1.
float texture50(vec2 p) {
  // Craquelure relief: a low-frequency emboss that also nudges the dot grid,
  // which turns the regular dots into the wormy print texture.
  float spacing = max(uCrackSpacing, 2.0);
  float depth = uCrackDepth / 10.0;
  vec2 rp = p / (spacing * 0.35);
  float h0 = vnoise(rp), hx = vnoise(rp + vec2(0.35, 0.0)), hy = vnoise(rp + vec2(0.0, 0.35));
  float relief = ((h0 - hx) + (h0 - hy)) * 2.0;
  vec2 warp = vec2(vnoise(p / (spacing * 0.18) + 3.1), vnoise(p / (spacing * 0.18) + 9.7)) - 0.5;
  vec2 q = p + warp * uDotSize * 1.6 * min(depth, 2.0);

  // Halftone Pattern (Dot) on 50% grey: a square dot screen with period 2 x Size;
  // at 50% coverage the dots touch corner to corner like a checkerboard.
  float period = max(uDotSize, 1.0) * 2.0;
  vec2 a = q * 6.2831853 / period;
  float screen = (cos(a.x) + cos(a.y)) * 0.25 + 0.5;
  float hardness = 1.0 + uDotContrast * 0.9;
  float dots = clamp(0.5 + (screen - 0.5) * hardness, 0.0, 1.0);

  // Crack grooves: dark lines along the Voronoi borders, wider with Depth.
  float border = voronoiBorder(p / spacing) * spacing;
  float groove = 1.0 - smoothstep(0.0, 0.6 + depth * 0.5, border);

  float t = dots + relief * depth * 0.35 - groove * min(depth, 1.5) * 0.6 + (uCrackBright - 5.0) * 0.03;
  // Photoshop filters on a 50% grey layer rarely reach pure black or white.
  return clamp(0.5 + (t - 0.5) * 0.7, 0.0, 1.0);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  vec2 uv = (p - uRect.xy) / uRect.zw;
  if (uHasImage < 0.5 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { outColor = vec4(0.0); return; }
  vec4 src = texture(uImage, uv);
  float alpha = src.a;
  if (alpha <= 0.002) { outColor = vec4(0.0); return; }

  float L = luma(src.rgb);
  L = (L - 0.5) * (1.0 + uContrast / 100.0) + 0.5 + uBrightness / 100.0;
  L = clamp(L, 0.0, 1.0);
  // Highlights moves only the light tones and Shadows only the dark ones; each fades
  // out toward the other end, so midtones move least. Positive lightens (less ink).
  float hiW = L * L;
  float shW = (1.0 - L) * (1.0 - L);
  L = clamp(L + uHighlights / 100.0 * 0.5 * hiW + uShadows / 100.0 * 0.5 * shW, 0.0, 1.0);

  // Grain hits midtones hardest, like Photoshop's Grain adjustment.
  float mid = 0.35 + 0.65 * (1.0 - pow(2.0 * L - 1.0, 2.0));
  L = clamp(L + grain(p) * uGrainAmount / 100.0 * 0.8 * mid, 0.0, 1.0);

  float T = texture50(p);
  float M = mix(L, max(L, T), uOpacity / 100.0);

  float thr = uThreshold / 255.0;
  float w = min(fwidth(M) * 0.5, 0.015);
  float ink = 1.0 - smoothstep(thr - w, thr + w, M);

  vec3 color = mix(uPaper, uInk, ink);
  float a = alpha * mix(ink, 1.0, uPaperFill);
  outColor = vec4(color * a, a);
}
`;
