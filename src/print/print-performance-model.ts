import type { ToolcraftEnvelopePerformanceConfig, ToolcraftPerformanceFixtureAdapter } from "@/toolcraft/runtime";

import { printPipeline } from "./print-pipeline";
import { SOURCE_MAX_EDGE } from "./print-source";

const numeric = (dimensionId: string): ToolcraftPerformanceFixtureAdapter => ({ dimensionId, apply: (value) => value, observe: (value) => Number(value) });
const resolutionValues: Record<string, number> = { "2k": 2048, "4k": 4096, "8k": 8192 };

export const printPerformanceModel = {
  usesCustomRenderer: true,
  rendererStrategy: "webgl",
  rendererPipeline: printPipeline,
  scenarios: [],
  rendererTechnique: {
    sourceRepresentation: "image-media",
    productRepresentation: "pixel",
    previewRenderer: "webgl",
    exportRenderer: "webgl",
    rendererStrategy: "webgl",
    gpu: {
      preview: { backend: "webgl", provider: "native", exception: { kind: "browser-compatibility", evidence: "WebGL2 runs in every current desktop browser, including those without WebGPU; one full-screen fragment pass needs no compute or storage." } },
      export: { backend: "webgl", provider: "native", exception: { kind: "browser-compatibility", evidence: "Export reuses the same WebGL2 program on an OffscreenCanvas so stills match the preview." } },
    },
    whyNotAlternativeStrategies: [
      "Canvas 2D cannot evaluate per-pixel grain, dot screen, Voronoi cracks and threshold at interactive rates on large canvases.",
      "WebGPU would exclude browsers without it for a single stateless fragment pass.",
    ],
    fidelityRisks: [
      "The source is decoded at up to 2048 px on the long edge; the print pattern itself is procedural at output resolution.",
    ],
    performanceRisks: [
      "Cost is one fragment pass per backing pixel per change; the background flood fill runs once per image and tolerance.",
    ],
    layers: [
      { id: "print", kind: "product-foreground", content: ["shader", "bitmap-media", "dense-pattern", "noise"], renderer: "webgl", primitiveCount: "low", exportMode: "included", uiSelector: '[data-testid="print-output"]' },
    ],
  },
  workloadEnvelope: {
    dimensions: [
      { id: "sourcePixels", unit: "source pixels", source: { kind: "schema-target", target: "source.image" }, mapping: "area", defaultValue: SOURCE_MAX_EDGE * SOURCE_MAX_EDGE, interactiveMax: SOURCE_MAX_EDGE * SOURCE_MAX_EDGE, batchMax: SOURCE_MAX_EDGE * SOURCE_MAX_EDGE },
      { id: "pixels", unit: "backing pixels", source: { kind: "external-input", id: "canvas-backing" }, mapping: "area", defaultValue: 2400 * 2400, interactiveMax: 4096 * 4096, batchMax: 4096 * 4096 },
      { id: "resolution", unit: "long-edge pixels", source: { kind: "schema-target", target: "export.image.resolution" }, mapping: "area", defaultValue: 4096, batchMax: 8192 },
    ],
  },
  fixtureAdapters: {
    dimensions: {
      sourcePixels: numeric("sourcePixels"),
      pixels: numeric("pixels"),
      resolution: {
        dimensionId: "resolution", kind: "exhaustive-discrete",
        domain: { kind: "schema-options", target: "export.image.resolution", optionValues: ["2k", "4k", "8k"] },
        entries: Object.entries(resolutionValues).map(([appliedValue, value]) => ({ appliedValue, value })),
        apply: (value) => Object.keys(resolutionValues).find((key) => resolutionValues[key] === value)!,
        observe: (value) => resolutionValues[String(value)]!,
      },
    },
  },
} as const satisfies ToolcraftEnvelopePerformanceConfig;
