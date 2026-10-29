# Toolcraft App Agent Worklog

## Status

Mode: product

Active change: printium-2

## Decision Trail

### Change ID: printium-2

- Entry type: focused
- Change ID: printium-2
- Request: "I want to add one more feature in the control panel, which is controlling the value of highlights and shadows. and push the update in the GitHub repo."
- Changed owner: src/print/print-settings.ts, print-controls.ts (Tone: tone.highlights, tone.shadows), print-shader.ts, print-gl.ts, print.test.ts; README.md.
- User-visible result: Tone gains Highlights and Shadows sliders (-100 to 100, default 0). After Brightness/Contrast, Highlights shifts luminance weighted by L², Shadows weighted by (1-L)², so each moves only its end of the range; positive lightens (less ink).
- Verification: typecheck, ai:check and app tests pass except the three known Windows-only kit failures; rocket renders at Highlights -80 and Shadows +80 compared with defaults on the tuning sheet; both sliders present in the Tone section.
- Risks: None beyond earlier entries.

### Change ID: printium-1

- Entry type: first-delivery
- Request: "i want you to use Toolcraft to build a web app that doing this effect , i got this screens from a tutorial to make this effect in photoshop ."
- Task type: new generated app — custom WebGL renderer, schema/controls, image upload with background removal, image export.
- User-visible result: Printium turns an uploaded photo into a one-colour retro print: grainy speckle in the highlights, halftone/crack texture in the midtones, solid ink in the shadows, ink and paper colours over a background colour. Defaults are the tutorial's Photoshop values.
- Source/reference checked: five tutorial screenshots supplied in chat (tamaken_design, "Retro Print Effect"): Grain adjustment (Amount 100, Size 25, Roughness 50); Solid Color #808080 converted to a Smart Object with Filter Gallery Halftone Pattern (Size 2, Contrast 12, Dot) and Craquelure (Spacing 35, Depth 15, Brightness 3); blend Lighter Color at 60%; Threshold 161; Gradient Map for colour; Remove Background for the cut-out. Before/After and Variations slides used for visual comparison.
- Reference inputs: None (still screenshots only; no video, GIF, Figma or recording).
- Docs/contracts read: AGENTS.md; core/media-upload.md; schema-reference.md (segmented); the Liquidium Toolcraft app as a working pattern for the same runtime version.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, infinity-canvas-scene-bounds, interaction-surface-ownership, timeline-mode-choice, output-export-required, controls-section-inventory-required, renderer-technique-inventory, renderer-gpu-provider, persistence-policy-explicit.
- View interaction intent: non-spatial — a flat processed image.
- Interaction ownership: every value is a global panel property-edit; the image is a panel collection-edit. Canvas shows output only.
- Decision: one WebGL2 fragment pass evaluates the whole Photoshop stack per pixel in scene pixels (luminance + brightness/contrast → midtone-weighted grain → max with a 50% grey texture of square dot screen, Voronoi crack grooves and noise relief at Opacity → Threshold → ink/paper). The same program renders exports on an OffscreenCanvas. The image is decoded once (long edge ≤ 2048 px, runtime rotate/flip applied); Remove background flood-fills near-white pixels from the image border and grows the removed area by 1 px.
- Alternatives rejected: Canvas 2D (too slow per pixel); WebGPU/VGPU (browser coverage for one stateless pass); a global white key (would erase white highlights inside the object); timeline/video (still effect, not requested).
- State/output mapping: source.image/source.cutout/source.tolerance → decoded texture with alpha; source.fit/source.scale → image rect; tone.* → luminance and threshold; grain.* → grain noise; texture.* → dot screen, cracks and blend opacity; color.ink/color.paper/color.paperFill → output colours; appearance.background/export.includeBackground → runtime background.
- Verification: typecheck, ai:check and src/print unit tests pass; in the built-in browser a transparent PNG rocket and a crop of the tutorial's Before screw were rendered, the texture was checked with grain off, the app loaded with every section, and Export PNG produced a 4096×4096 PNG with ink pixels (download intercepted in-page).
- Risks: Risk: the texture is a procedural approximation of Photoshop's Halftone Pattern and Craquelure filters, matched by eye, not pixel-identical. Risk: pattern sizes are in canvas pixels, so changing canvas size changes the pattern scale relative to the image.

## Decisions

### Renderer

- Decision: WebGL2 native provider with a browser-compatibility exception, preview and export.
- Reason: One stateless fragment pass; WebGL2 runs in every current desktop browser.
- Evidence: src/print/print-gl.ts, src/print/print-shader.ts, rendererTechnique in src/print/print-performance-model.ts.

### View Interaction

- Decision: non-spatial.
- Reason: Flat image output with no camera.
- Evidence: appProductReadiness.viewInteraction in src/print/print-inventory.ts.

### Interaction Ownership

- Decision: Panel owns all values and the image upload.
- Reason: The tutorial sets every value in panels; the canvas must stay clear to judge the print.
- Evidence: appProductReadiness.interactionOwnership in src/print/print-inventory.ts.

### Timeline

- Decision: No timeline.
- Reason: A still effect on a still image.
- Evidence: modules list in src/app/app-schema.ts.

### Layers

- Decision: No Layers module.
- Reason: No layer workflow was requested.
- Evidence: modules list in src/app/app-schema.ts.

### Controls

- Decision: Sections Image, Placement, Tone, Grain, Texture, Color after runtime Settings, in the order of the tutorial's steps; units follow Photoshop's panels so tutorial numbers can be typed in.
- Reason: Groups by recipe step; the uploader is runtime-standalone, so placement lives in its own section.
- Evidence: src/print/print-controls.ts and appControlSectionInventory in src/print/print-inventory.ts.

### Export

- Decision: Image export only (toolcraft-default PNG/JPG); SVG and video not requested.
- Reason: The request asks for the effect on an image.
- Evidence: exportIntent in src/print/print-inventory.ts.

### Performance

- Decision: Workload dimensions are source pixels (≤ 2048²), backing pixels and export resolution; decoding is memoised per image and orientation, the flood fill per tolerance.
- Reason: Frame cost is linear in pixels.
- Evidence: src/print/print-performance-model.ts; paths derived in src/app/app-performance.ts. No measured performance has been run.

Canonical control values and selected-entity isolation follow runtime representations; this product has no render scale.

## Evidence

- Source reviewed: the tutorial screenshots, Toolcraft local docs, and the Liquidium Toolcraft app for current API shapes.

## Verification

Functional checks only; measured performance and the protected delivery gate were not run.

## Risks

- Risk: Visual parity with Photoshop's filters is approximate.
