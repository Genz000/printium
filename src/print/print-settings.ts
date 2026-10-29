export const IMAGE_TARGET = "source.image";
export const BACKGROUND_TARGET = "appearance.background";

export type FitMode = "contain" | "cover";

/**
 * Every value mirrors one setting of the Photoshop recipe the effect is built from:
 * Grain adjustment → 50% grey layer with Halftone Pattern + Craquelure, blended
 * Lighter Color at an opacity → Threshold → Gradient Map (ink to paper).
 * Units follow Photoshop's panels so the tutorial numbers can be typed in directly.
 */
export type PrintSettings = {
  fit: FitMode;
  scale: number;
  cutout: boolean;
  tolerance: number;
  brightness: number;
  contrast: number;
  grainAmount: number;
  grainSize: number;
  grainRoughness: number;
  dotSize: number;
  dotContrast: number;
  crackSpacing: number;
  crackDepth: number;
  crackBrightness: number;
  opacity: number;
  threshold: number;
  ink: string;
  paper: string;
  paperFill: boolean;
};

/** The tutorial's values: Grain 100/25/50, Halftone 2/12, Craquelure 35/15/3, Lighter Color 60%, Threshold 161. */
export const printDefaults: PrintSettings & { background: string } = {
  fit: "contain",
  scale: 0.9,
  cutout: true,
  tolerance: 24,
  brightness: 0,
  contrast: 0,
  grainAmount: 100,
  grainSize: 25,
  grainRoughness: 50,
  dotSize: 2,
  dotContrast: 12,
  crackSpacing: 35,
  crackDepth: 15,
  crackBrightness: 3,
  opacity: 60,
  threshold: 161,
  ink: "#2B2A8C",
  paper: "#E9E3F1",
  paperFill: true,
  background: "#EFD8DF",
};

export const imageTargets = ["source.fit", "source.scale", "source.cutout", "source.tolerance"] as const;
export const toneTargets = ["tone.brightness", "tone.contrast", "tone.threshold"] as const;
export const grainTargets = ["grain.amount", "grain.size", "grain.roughness"] as const;
export const textureTargets = [
  "texture.dotSize", "texture.dotContrast", "texture.crackSpacing", "texture.crackDepth", "texture.crackBrightness", "texture.opacity",
] as const;
export const colorTargets = ["color.ink", "color.paper", "color.paperFill"] as const;

export function readPrintSettings(values: Readonly<Record<string, unknown>>): PrintSettings {
  const d = printDefaults;
  const n = (target: string, fallback: number) => {
    const v = values[target];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  };
  const b = (target: string, fallback: boolean) => (typeof values[target] === "boolean" ? (values[target] as boolean) : fallback);
  const c = (target: string, fallback: string) => (typeof values[target] === "string" ? (values[target] as string) : fallback);
  return {
    fit: values["source.fit"] === "cover" ? "cover" : values["source.fit"] === "contain" ? "contain" : d.fit,
    scale: n("source.scale", d.scale),
    cutout: b("source.cutout", d.cutout),
    tolerance: n("source.tolerance", d.tolerance),
    brightness: n("tone.brightness", d.brightness),
    contrast: n("tone.contrast", d.contrast),
    grainAmount: n("grain.amount", d.grainAmount),
    grainSize: n("grain.size", d.grainSize),
    grainRoughness: n("grain.roughness", d.grainRoughness),
    dotSize: n("texture.dotSize", d.dotSize),
    dotContrast: n("texture.dotContrast", d.dotContrast),
    crackSpacing: n("texture.crackSpacing", d.crackSpacing),
    crackDepth: n("texture.crackDepth", d.crackDepth),
    crackBrightness: n("texture.crackBrightness", d.crackBrightness),
    opacity: n("texture.opacity", d.opacity),
    threshold: n("tone.threshold", d.threshold),
    ink: c("color.ink", d.ink),
    paper: c("color.paper", d.paper),
    paperFill: b("color.paperFill", d.paperFill),
  };
}

/** Image rectangle inside the canvas, in scene pixels. */
export function placeImage(
  canvasW: number, canvasH: number, imageW: number, imageH: number, fit: FitMode, scale: number,
): { x: number; y: number; width: number; height: number } {
  const fitK = fit === "cover" ? Math.max(canvasW / imageW, canvasH / imageH) : Math.min(canvasW / imageW, canvasH / imageH);
  const k = fitK * scale;
  const width = imageW * k;
  const height = imageH * k;
  return { x: (canvasW - width) / 2, y: (canvasH - height) / 2, width, height };
}

/** Largest backing edge the preview allocates. */
export const MAX_BACKING_EDGE = 4096;

/** Preview pixels per scene pixel: twice the on-screen density, capped at MAX_BACKING_EDGE. */
export function backingScale(width: number, height: number, zoom: number, dpr: number): number {
  const wanted = 2 * Math.max(zoom, 0.01) * Math.max(dpr, 1);
  const cap = MAX_BACKING_EDGE / Math.max(width, height, 1);
  return Math.max(0.05, Math.min(wanted, cap));
}
