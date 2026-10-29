import { describe, expect, it } from "vitest";

import { appAcceptance, validateProductAcceptanceCoverage } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("assembles the Printium product on the Toolcraft runtime", () => {
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toMatchObject({ mode: "editable-output" });
    expect(appSchema.toolbar).toEqual({ history: true, radar: true, theme: true, zoom: true });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.modulePlan.modules.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["media-source", "image-export"]),
    );
  });

  it("orders product sections after runtime Settings, in the tutorial's step order", () => {
    const productSections = appSchema.panels.controls?.sections
      .map((section) => section.id)
      .filter((id) => !id.startsWith("runtime."));
    expect(productSections).toEqual(["image", "placement", "tone", "grain", "texture", "color"]);
  });

  it("derives performance scenarios from the renderer pipeline", () => {
    expect(appPerformance.scenarios.length).toBeGreaterThan(0);
    expect(appPerformance.workloadEnvelope.dimensions.map((d) => d.id)).toEqual(["sourcePixels", "pixels", "resolution"]);
  });

  it("declares production reload coverage", () => {
    expect(appSchema.persistence.storage).toBe("localStorage");
    if (appSchema.persistence.storage !== "localStorage") throw new Error("Printium persists settings in localStorage.");
    expect(appSchema.persistence.include).toContain("canvas");
    expect(appAcceptance.find((entry) => entry.id === "persistence.reload")).toMatchObject({
      evidence: "persistence-state",
      persistenceCoverage: "reload",
      persistenceSlices: appSchema.persistence.include,
    });
    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });
});
