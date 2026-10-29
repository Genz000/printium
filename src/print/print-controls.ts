import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { BACKGROUND_TARGET, IMAGE_TARGET, printDefaults as d } from "./print-settings";

const always = { applicability: { mode: "always" } } as const;
const live = {
  ...always, performanceRole: "responsiveness",
  performanceReason: "Changes one shader uniform; the next frame redraws a single full-screen pass.",
} as const;
const slider = { sliderValueKind: "continuous" } as const;

export const backgroundControls = {
  include: { ...live, type: "switch", target: "export.includeBackground", label: "Background", defaultValue: true },
  color: { ...live, type: "color", target: BACKGROUND_TARGET, label: "Background color", defaultValue: d.background },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const imageControls = {
  image: {
    ...always, type: "fileDrop", target: IMAGE_TARGET, label: false, assetKind: "image", multiple: false, defaultValue: [],
    description: "A photo or render of an object. A plain white surround can be cut away in Placement.",
    performanceRole: "workload",
    performanceReason: "A new image is decoded once (long edge up to 2048 px) and uploaded as one texture.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const placementControls = {
  fit: {
    ...live, type: "segmented", target: "source.fit", label: "Fit", defaultValue: d.fit,
    description: "Contain shows the whole image inside the canvas; Cover fills the canvas and crops the overflow.",
    options: [{ label: "Contain", value: "contain" }, { label: "Cover", value: "cover" }],
  },
  scale: {
    ...live, ...slider, type: "slider", target: "source.scale", label: "Scale", defaultValue: d.scale,
    min: 0.1, max: 2, step: 0.01, editableRange: { hardMin: 0.01 },
    description: "Size of the image relative to the Fit size.",
  },
  cutout: {
    ...always, type: "switch", target: "source.cutout", label: "Cut out white", defaultValue: d.cutout,
    description: "Cuts away the white surround of the object (flood fill from the image border), so only the object is printed.",
    performanceRole: "responsiveness", performanceReason: "Reruns one flood fill over the decoded image (at most 2048 px on the long edge), then one shader pass.",
  },
  tolerance: {
    applicability: { mode: "conditional", all: [{ target: "source.cutout", equals: true }] },
    ...slider, type: "slider", target: "source.tolerance", label: "Tolerance", defaultValue: d.tolerance,
    min: 0, max: 128, step: 1, editableRange: { hardMin: 0, hardMax: 255 },
    description: "How far from pure white a surrounding pixel may be and still be cut away.",
    performanceRole: "responsiveness", performanceReason: "Reruns one flood fill over the decoded image (at most 2048 px on the long edge), then one shader pass.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const toneControls = {
  brightness: {
    ...live, ...slider, type: "slider", target: "tone.brightness", label: "Brightness", defaultValue: d.brightness,
    min: -100, max: 100, step: 1, editableRange: { hardMin: -100, hardMax: 100 },
    description: "Lightens or darkens the image before the print pattern; brighter means less ink.",
  },
  contrast: {
    ...live, ...slider, type: "slider", target: "tone.contrast", label: "Contrast", defaultValue: d.contrast,
    min: -100, max: 100, step: 1, editableRange: { hardMin: -100 },
    description: "Spreads or compresses the image tones before the print pattern.",
  },
  threshold: {
    ...live, ...slider, type: "slider", target: "tone.threshold", label: "Threshold", defaultValue: d.threshold,
    min: 1, max: 255, step: 1, editableRange: { hardMin: 1, hardMax: 255 },
    description: "Photoshop Threshold level: everything darker turns to ink, everything lighter to paper. Higher prints more ink.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const grainControls = {
  amount: {
    ...live, ...slider, type: "slider", target: "grain.amount", label: "Amount", defaultValue: d.grainAmount,
    min: 0, max: 100, step: 1, editableRange: { hardMin: 0, hardMax: 100 },
    description: "Strength of the film grain added before the threshold; it breaks midtones into speckle.",
  },
  size: {
    ...live, ...slider, type: "slider", target: "grain.size", label: "Size", defaultValue: d.grainSize,
    min: 0, max: 100, step: 1, editableRange: { hardMin: 0, hardMax: 100 },
    description: "Size of the grains.",
  },
  roughness: {
    ...live, ...slider, type: "slider", target: "grain.roughness", label: "Roughness", defaultValue: d.grainRoughness,
    min: 0, max: 100, step: 1, editableRange: { hardMin: 0, hardMax: 100 },
    description: "Mixes smooth grain with sharp single-pixel speckle.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const textureControls = {
  dotSize: {
    ...live, ...slider, type: "slider", target: "texture.dotSize", label: "Dot size", defaultValue: d.dotSize,
    min: 1, max: 12, step: 0.5, unit: "px", editableRange: { hardMin: 0.5 },
    description: "Halftone Pattern size: the dot screen repeats every two sizes, in canvas pixels.",
  },
  dotContrast: {
    ...live, ...slider, type: "slider", target: "texture.dotContrast", label: "Dot contrast", defaultValue: d.dotContrast,
    min: 0, max: 50, step: 1, editableRange: { hardMin: 0 },
    description: "Halftone Pattern contrast: higher makes hard-edged dots.",
  },
  crackSpacing: {
    ...live, ...slider, type: "slider", target: "texture.crackSpacing", label: "Crack spacing", defaultValue: d.crackSpacing,
    min: 2, max: 100, step: 1, unit: "px", editableRange: { hardMin: 2 },
    description: "Craquelure spacing: distance between the cracks, in canvas pixels.",
  },
  crackDepth: {
    ...live, ...slider, type: "slider", target: "texture.crackDepth", label: "Crack depth", defaultValue: d.crackDepth,
    min: 0, max: 20, step: 0.5, editableRange: { hardMin: 0, hardMax: 20 },
    description: "Craquelure depth: how strongly the cracks and their relief break up the dots.",
  },
  crackBrightness: {
    ...live, ...slider, type: "slider", target: "texture.crackBrightness", label: "Crack brightness", defaultValue: d.crackBrightness,
    min: 0, max: 10, step: 0.5, editableRange: { hardMin: 0, hardMax: 10 },
    description: "Craquelure brightness: lightens the whole texture, which leaves less ink.",
  },
  opacity: {
    ...live, ...slider, type: "slider", target: "texture.opacity", label: "Opacity", defaultValue: d.opacity,
    min: 0, max: 100, step: 1, unit: "%", editableRange: { hardMin: 0, hardMax: 100 },
    description: "Opacity of the texture layer, blended Lighter Color over the image. 0 leaves a plain threshold.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const colorControls = {
  ink: { ...live, type: "color", target: "color.ink", label: "Ink color", defaultValue: d.ink, semanticGroup: "ink", description: "Colour of the printed areas." },
  paperFill: {
    ...live, type: "switch", target: "color.paperFill", label: "Paper fill", defaultValue: d.paperFill,
    description: "Off prints ink only, so the canvas colour shows in the unprinted areas.",
  },
  paper: {
    applicability: { mode: "conditional", all: [{ target: "color.paperFill", equals: true }] },
    performanceRole: "responsiveness", performanceReason: "Changes one shader uniform; the next frame redraws a single full-screen pass.",
    type: "color", target: "color.paper", label: "Paper color", defaultValue: d.paper, semanticGroup: "paper",
    description: "Colour of the unprinted areas inside the object.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;
