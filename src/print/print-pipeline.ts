import { registerToolcraftRendererPipeline, type ToolcraftRendererPipelinePassContract } from "@/toolcraft/runtime";

import { colorTargets, grainTargets, IMAGE_TARGET, imageTargets, textureTargets, toneTargets } from "./print-settings";
import type { PrintSource } from "./print-source";

const STAGE = {
  kind: "intrinsic",
  reason: "The print is drawn only inside the canvas frame: the image is fitted into it and Cover crops at its edges, so nothing reaches outside.",
} as const;

const canvasTargets = ["canvas.size.width", "canvas.size.height"];
const sourceTargets = [IMAGE_TARGET, "source.cutout", "source.tolerance"];
const uniformTargets = [
  "source.fit", "source.scale", ...toneTargets, ...grainTargets, ...textureTargets, ...colorTargets,
];
const frameInputs = [...uniformTargets, ...canvasTargets];

export const printPipeline = registerToolcraftRendererPipeline<{
  source: ToolcraftRendererPipelinePassContract<PrintSource | null>;
  frame: ToolcraftRendererPipelinePassContract<string>;
  export: ToolcraftRendererPipelinePassContract<void>;
}>()({
  runtimeId: "printium-v1",
  passes: [
    {
      id: "source", kind: "preprocess", inputs: sourceTargets, invalidatedBy: sourceTargets, cacheKey: ["resources"],
      runsOn: "main", output: "intermediate", quality: "full", sceneBounds: STAGE,
      cost: { dimensions: ["sourcePixels"], relationship: "linear", frequency: "discrete" },
      lifecycle: { cache: "memoized", resourceScope: "source" },
    },
    {
      id: "frame", kind: "composite", inputs: frameInputs, invalidatedBy: frameInputs, cacheKey: ["frame"],
      runsOn: "main", output: "preview", quality: "full", sceneBounds: STAGE,
      cost: { dimensions: ["pixels"], relationship: "linear", frequency: "frame" },
      lifecycle: { cache: "memoized", resourceScope: "renderer" },
    },
    {
      id: "export", kind: "export", inputs: [...sourceTargets, ...frameInputs, "export.image.resolution"],
      invalidatedBy: ["export.image"], runsOn: "export-only", output: "export", quality: "export",
      cost: { dimensions: ["resolution"], relationship: "linear", frequency: "batch" },
      lifecycle: { cache: "none", resourceScope: "call" },
    },
  ],
  interactionInvalidation: [
    { interaction: "initial-render", targets: ["canvas"], invalidates: ["source", "frame"] },
    { interaction: "media-import", targets: [IMAGE_TARGET], invalidates: ["source", "frame"], mustNotInvalidate: [] },
    { interaction: "control-drag", targets: ["source.tolerance"], invalidates: ["source", "frame"], mustNotInvalidate: [] },
    { interaction: "control-change", targets: ["source.cutout", "source.tolerance"], invalidates: ["source", "frame"], mustNotInvalidate: [] },
    { interaction: "control-drag", targets: uniformTargets.filter((t) => t !== "source.fit" && t !== "color.paperFill"), invalidates: ["frame"], mustNotInvalidate: ["source"] },
    { interaction: "control-change", targets: [...uniformTargets, ...canvasTargets], invalidates: ["frame"], mustNotInvalidate: ["source"] },
    {
      interaction: "control-change",
      targets: ["appearance.background", "export.includeBackground", "canvas.infinity", "canvas.workspaceBackground",
        "export.image.format", "export.image.resolution"],
      invalidates: [], mustNotInvalidate: ["source", "frame"],
    },
    { interaction: "viewport-drag", targets: ["canvas"], invalidates: [], mustNotInvalidate: ["source", "frame"] },
    // Zoom changes the supersampled backing resolution once the gesture ends.
    { interaction: "viewport-zoom", targets: ["canvas"], invalidates: ["frame"], mustNotInvalidate: ["source"] },
    { interaction: "export", targets: ["export.image"], invalidates: ["export"], mustNotInvalidate: ["source", "frame"] },
  ],
});

export const sourcePass = printPipeline.getPass("source");
export const framePass = printPipeline.getPass("frame");
export const exportPass = printPipeline.getPass("export");
