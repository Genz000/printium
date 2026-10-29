import type {
  ToolcraftControlSectionInventoryEntry, ToolcraftProductReadiness, ToolcraftTransferMode,
} from "../app/acceptance/types";

import { colorTargets, grainTargets, IMAGE_TARGET, imageTargets, textureTargets, toneTargets } from "./print-settings";

/** The user's request in this session, verbatim. */
export const ORIGINAL_REQUEST_TEXT =
  "i want you to use Toolcraft to build a web app that doing this effect , i got this screens from a tutorial to make this effect in photoshop .";

export const printTransferMode: ToolcraftTransferMode = {
  mode: "new-toolcraft-app",
  animationIntent: { mode: "none" },
  referenceInputs: [],
};

export const printSectionInventory = [
  {
    id: "runtime.setup", title: "Settings", entityId: "background", entity: "Output background",
    targets: ["export.includeBackground", "appearance.background"],
    groupingReason: "One output background; runtime relocates this source pair into Settings.",
    finiteSelectors: [{ target: "export.includeBackground", role: "parameter", reason: "Controls background visibility and PNG alpha; the colour stays editable in both states." }],
  },
  {
    id: "image", title: "Image", entityId: "image", entity: "Source image", targets: [IMAGE_TARGET],
    groupingReason: "The photo being printed.",
    finiteSelectors: [],
  },
  {
    id: "placement", title: "Placement", entityId: "placement", entity: "Image placement and cut-out", targets: [...imageTargets],
    groupingReason: "How the photo sits in the canvas and whether its white background is removed.",
    finiteSelectors: [
      { target: "source.fit", role: "parameter", reason: "Contain or Cover changes only the image size; no other control depends on it." },
      { target: "source.cutout", role: "branch", affectedTargets: ["source.scale"], reason: "Cut out white reveals Tolerance and changes which part of the scaled image is printed." },
    ],
  },
  {
    id: "tone", title: "Tone", entityId: "tone", entity: "Tone and threshold", targets: [...toneTargets],
    groupingReason: "How much of the image turns to ink: tone adjustments before the pattern and the final Threshold level.",
    finiteSelectors: [],
  },
  {
    id: "grain", title: "Grain", entityId: "grain", entity: "Film grain", targets: [...grainTargets],
    groupingReason: "Photoshop's Grain adjustment layer, step 1 of the recipe.",
    finiteSelectors: [],
  },
  {
    id: "texture", title: "Texture", entityId: "texture", entity: "Print texture layer", targets: [...textureTargets],
    groupingReason: "The 50% grey layer of steps 2 to 5: Halftone Pattern dots, Craquelure cracks and its Lighter Color opacity.",
    finiteSelectors: [],
  },
  {
    id: "color", title: "Ink", entityId: "color", entity: "Ink and paper", targets: [...colorTargets],
    groupingReason: "The Gradient Map step: ink colour for printed areas and paper colour for unprinted ones.",
    finiteSelectors: [{ target: "color.paperFill", role: "branch", affectedTargets: ["color.ink"], reason: "Paper fill reveals the Paper colour and decides whether unprinted areas cover the background next to the ink." }],
  },
  {
    id: "runtime.image-export", title: "Image Export", entityId: "image-export", entity: "Raster image output",
    targets: ["export.image.format", "export.image.resolution"], groupingReason: "Runtime-owned image format and resolution govern one exported artifact.",
    finiteSelectors: [
      { target: "export.image.format", role: "parameter", reason: "Selects PNG alpha support or opaque JPEG encoding." },
      { target: "export.image.resolution", role: "parameter", reason: "Selects the output long-edge pixel size." },
    ],
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];

const panelProperty = (target: string) => ({
  id: `${target}-property`, target, capability: "property-edit" as const, surface: "panel" as const,
  selectionScope: { mode: "global" as const },
  evidence: { source: "reference" as const, detail: "The Photoshop tutorial sets every value in adjustment-layer and filter panels." },
  reason: "A global setting of the whole print with no selected entity.",
  alternative: { surface: "canvas" as const, reason: "Canvas handles would cover the print being judged and have no spatial meaning for these values." },
});

export const printReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "Printium",
  productSummary: "Retro print effect: an uploaded photo becomes a one-colour grainy halftone print (grain, halftone, craquelure, threshold, ink and paper).",
  requestedBehavior: ORIGINAL_REQUEST_TEXT,
  exportIntent: {
    image: { mode: "toolcraft-default" },
    svg: { mode: "not-requested" },
    video: { mode: "not-requested" },
  },
  viewInteraction: { mode: "non-spatial", reason: "The output is a flat processed image with no camera or 3D scene." },
  interactionOwnership: [
    {
      id: "source.image-collection", target: IMAGE_TARGET, capability: "collection-edit", surface: "panel",
      evidence: { source: "usability-analysis", detail: "Toolcraft source uploads live in a panel fileDrop." },
      reason: "Uploading and removing the source image is file management, not spatial editing.",
      alternative: { surface: "canvas", reason: "Upload chrome on the canvas would cover the print." },
    },
    ...[...imageTargets, ...toneTargets, ...grainTargets, ...textureTargets, ...colorTargets].map(panelProperty),
  ],
};
