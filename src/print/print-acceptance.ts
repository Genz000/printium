import type { ToolcraftComponentAcceptance } from "../app/acceptance/types";
import { appSchema } from "../app/app-schema";

import { colorControls, grainControls, placementControls, textureControls, toneControls } from "./print-controls";
import { IMAGE_TARGET } from "./print-settings";

type Budget = "standard" | "extended-io";
type Row = ToolcraftComponentAcceptance;

const browser = (file: string, testName: string, budget: Budget = "standard") =>
  ({ file: `e2e/${file}.spec.ts` as `e2e/${string}.spec.ts`, testName, budget });

const optionsOf = (control: { options?: readonly { value: string }[] }) => control.options?.map((o) => o.value);

const productControls = { ...placementControls, ...toneControls, ...grainControls, ...textureControls, ...colorControls };

const controlRows: Row[] = Object.values(productControls).map((control) => {
  const options = "options" in control ? optionsOf(control) : undefined;
  const target = control.target;
  return {
    id: target, target, kind: "control", componentType: control.type, interactionId: `${target}-property`,
    automated: true, automatedTestName: `print parameter ${target}`,
    browser: browser("product-print-controls", `browser: print parameter ${target}`),
    evidence: "product-output",
    fixture: "Default settings with a photo of an object on a white background.",
    userAction: `Change ${control.label} through the real control.`,
    expectedObservable: "The print canvas pixels change according to the setting.",
    ...(options ? { optionCoverage: options } : {}),
  } satisfies Row;
});

const exportSettingRow = (target: string, options: readonly string[]): Row => ({
  id: target, target, kind: "control", componentType: "select",
  automated: true, automatedTestName: `print contract ${target}`,
  browser: browser("product-print-export", "browser: print image export delivers all formats and sizes", "extended-io"),
  evidence: "exported-bytes", optionCoverage: options,
  fixture: "Default settings with an uploaded photo.", userAction: `Select each ${target} option and export.`,
  expectedObservable: "The downloaded file has the selected format and dimensions.",
});

const runtimeRow = (id: string, target: string, evidence: Row["evidence"], file: string, testName: string, extra: Partial<Row>, budget: Budget = "standard"): Row => ({
  id, target, kind: "runtime", componentType: id, automated: true, automatedTestName: `print contract ${id}`,
  browser: browser(file, testName, budget), evidence,
  fixture: "Default settings with an uploaded photo and real Toolcraft controls.",
  userAction: `Exercise ${id} through the visible UI.`,
  expectedObservable: `The print output and runtime workspace implement ${id}.`,
  ...extra,
});

export const printAcceptance: readonly Row[] = [
  {
    id: IMAGE_TARGET, target: IMAGE_TARGET, kind: "control", componentType: "fileDrop", interactionId: "source.image-collection",
    automated: true, automatedTestName: "print contract source.image",
    browser: browser("product-print-image", "browser: print image upload, clear and reset", "extended-io"),
    evidence: "media-lifecycle", mediaLifecycleCoverage: ["upload", "remove", "reset", "rotate", "flip", "transform-output"],
    fixture: "A photo of an object on a white background.",
    userAction: "Upload the photo, rotate and flip it, then remove it and use section Reset.",
    expectedObservable: "The object renders as a print after upload, turns with 90° and mirrors with Flip H/V, and the canvas is empty after removal.",
  },
  ...controlRows,
  {
    ...controlRows[0], id: "appearance.background", target: "appearance.background", componentType: "color", interactionId: undefined,
    automatedTestName: "print contract appearance.background",
    browser: browser("product-print-background", "browser: print background color changes output"),
    userAction: "Change Background color.", optionCoverage: undefined,
  },
  runtimeRow("background.output", "export.includeBackground", "product-output", "product-print-background",
    "browser: print background output follows runtime semantics",
    { kind: "control", componentType: "switch", backgroundOutputCoverage: "all-required-background-output" }),
  exportSettingRow("export.image.format", ["png", "jpg"]),
  exportSettingRow("export.image.resolution", ["2k", "4k", "8k"]),
  runtimeRow("export.image", "actions.output", "exported-bytes", "product-print-export",
    "browser: print image export delivers all formats and sizes",
    { componentType: "panelActions", actionCoverage: ["export.png"], exportArtifactCoverage: "all-required-image-export-behavior", infinityCanvasCoverage: "scene-bounds-image-export" }, "extended-io"),
  runtimeRow("export.actions", "actions.output", "exported-bytes", "product-print-export",
    "browser: print footer exports PNG",
    { kind: "control", componentType: "panelActions", actionCoverage: ["export.png"], exportArtifactCoverage: ["all-required-image-export-behavior"] }, "extended-io"),
  runtimeRow("canvas.size", "canvas.size.width", "product-output", "product-print-workspace",
    "browser: print canvas sizing changes output", {}),
  runtimeRow("canvas.infinity", "canvas.infinity", "viewport-side-effect", "product-print-workspace",
    "browser: print infinity preserves scene and viewport", { infinityCanvasCoverage: "mode-continuity-and-restoration" }),
  runtimeRow("persistence.reload", "canvas.size.width", "persistence-state", "product-print-persistence",
    "browser: print restores values and workspace after reload",
    { persistenceCoverage: "reload", persistenceSlices: appSchema.persistence.storage === "localStorage" ? appSchema.persistence.include : [] }, "extended-io"),
];
