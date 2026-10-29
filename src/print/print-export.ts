import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { PrintRenderer } from "./print-gl";
import { exportPass } from "./print-pipeline";
import { readPrintSettings } from "./print-settings";
import { cachedSource, imageSource } from "./print-source";

let exportRenderer: PrintRenderer | null = null;
/** Largest edge the export supersampling pass renders before averaging down. */
const MAX_SUPERSAMPLED_EDGE = 8192;

/** Renders the same shader at export resolution and paints it into the runtime's 2D frame. */
export const printExport: ToolcraftProductExportRenderer = {
  baseFileName: "printium",
  async renderFrame({ context, frame, pixelRatio, state, rendererPipeline, signal }) {
    const render = () => {
      signal.throwIfAborted();
      const settings = readPrintSettings(state.values);
      const source = imageSource(state.mediaAssets);
      const pixels = cachedSource(source, settings.cutout, settings.tolerance);
      if (source && !pixels) throw new Error("The image is still being prepared. Try the export again in a moment.");
      exportRenderer ??= new PrintRenderer(new OffscreenCanvas(1, 1), true);
      exportRenderer.setSource(pixels);
      const outW = frame.width * pixelRatio;
      const outH = frame.height * pixelRatio;
      const ss = Math.max(1, Math.min(2, MAX_SUPERSAMPLED_EDGE / Math.max(outW, outH)));
      exportRenderer.render(settings, frame.width, frame.height, outW * ss, outH * ss);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(exportRenderer.surface, frame.x, frame.y, frame.width, frame.height);
      signal.throwIfAborted();
    };
    if (rendererPipeline) await rendererPipeline.runPass(exportPass, undefined, render);
    else render();
  },
};
