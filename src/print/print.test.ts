import { describe, expect, it } from "vitest";

import { cutout } from "./print-cutout";
import { backingScale, placeImage, printDefaults, readPrintSettings } from "./print-settings";

describe("print settings", () => {
  it("defaults to the tutorial's Photoshop values", () => {
    expect(readPrintSettings({})).toMatchObject({
      grainAmount: 100, grainSize: 25, grainRoughness: 50,
      dotSize: 2, dotContrast: 12, crackSpacing: 35, crackDepth: 15, crackBrightness: 3,
      opacity: 60, threshold: 161,
    });
  });

  it("reads Highlights and Shadows, neutral by default", () => {
    expect(readPrintSettings({})).toMatchObject({ highlights: 0, shadows: 0 });
    expect(readPrintSettings({ "tone.highlights": -40, "tone.shadows": 25 })).toMatchObject({ highlights: -40, shadows: 25 });
  });

  it("falls back on invalid values", () => {
    const s = readPrintSettings({ "source.fit": "stretch", "tone.threshold": Number.NaN, "color.paperFill": "yes" });
    expect(s.fit).toBe(printDefaults.fit);
    expect(s.threshold).toBe(printDefaults.threshold);
    expect(s.paperFill).toBe(printDefaults.paperFill);
  });
});

describe("image placement", () => {
  it("contains a wide image inside a square canvas, centred", () => {
    expect(placeImage(1000, 1000, 2000, 1000, "contain", 1)).toEqual({ x: 0, y: 250, width: 1000, height: 500 });
  });
  it("covers the canvas and crops the overflow", () => {
    expect(placeImage(1000, 1000, 2000, 1000, "cover", 1)).toEqual({ x: -500, y: 0, width: 2000, height: 1000 });
  });
  it("scales around the centre", () => {
    expect(placeImage(1000, 1000, 1000, 1000, "contain", 0.5)).toEqual({ x: 250, y: 250, width: 500, height: 500 });
  });
});

describe("background cut-out", () => {
  // 7x7 white image with a dark 3x3 square in the middle and a white pixel at its centre.
  const size = 7;
  const rgba = new Uint8Array(size * size * 4).fill(255);
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) {
    const o = (y * size + x) * 4;
    if (x !== 3 || y !== 3) { rgba[o] = 30; rgba[o + 1] = 30; rgba[o + 2] = 30; }
  }

  const alpha = (out: Uint8Array, x: number, y: number) => out[(y * size + x) * 4 + 3];
  const cut = (src: Uint8Array, tolerance: number) => {
    const copy = new Uint8Array(src);
    cutout(copy, size, size, tolerance);
    return copy;
  };

  it("removes white connected to the border but keeps enclosed white highlights", () => {
    const out = cut(rgba, 24);
    expect(alpha(out, 0, 0)).toBe(0);
    expect(alpha(out, 3, 3)).toBe(255);
    expect(out[0]).toBe(255);
  });

  it("grows the removed area by one pixel to drop edge halos", () => {
    const out = cut(rgba, 24);
    expect(alpha(out, 2, 2)).toBe(0);
    expect(alpha(out, 3, 2)).toBe(0);
  });

  it("zero tolerance keeps off-white backgrounds", () => {
    const grey = new Uint8Array(rgba).map((v, i) => (i % 4 === 3 ? v : Math.min(v, 240)));
    expect(alpha(cut(grey, 0), 0, 0)).toBe(255);
    expect(alpha(cut(grey, 24), 0, 0)).toBe(0);
  });
});

describe("preview supersampling", () => {
  it("renders at twice the on-screen density, capped at 4096 px", () => {
    expect(backingScale(1600, 1600, 1, 1)).toBe(2);
    expect(backingScale(1600, 1600, 0.5, 1)).toBe(1);
    expect(backingScale(1600, 1600, 2, 2) * 1600).toBeCloseTo(4096);
  });
});
