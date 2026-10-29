import { defineToolcraftPerformance, deriveToolcraftPerformancePaths, type ToolcraftPerformanceScenario } from "@/toolcraft/runtime";

import { printPerformanceModel } from "../print/print-performance-model";
import { appSchema } from "./app-schema";

export const printPerformancePaths = deriveToolcraftPerformancePaths(appSchema, printPerformanceModel);

export const appPerformance = defineToolcraftPerformance({
  ...printPerformanceModel,
  scenarios: printPerformancePaths.map((path, index): ToolcraftPerformanceScenario => ({
    id: `print-path-${index}`, pathId: path.id, coversTargets: path.targets, interaction: path.interaction,
    automated: true, automatedTestName: "print render plan has valid derived paths and fixtures",
    browser: true, browserTestName: `browser perf: toolcraft path ${path.id}`,
    expectedObservable: "The print preview, viewport or decoded artifact reflects the exact applied operation.",
    fixture: "Compiled reachable print workload", uiSelector: '[data-testid="print-output"]',
    ...(path.interaction === "export" ? { actionValue: "export.png", controlLabel: "Export PNG", completionEvidence: "download" as const } : {}),
  } as ToolcraftPerformanceScenario)),
});
