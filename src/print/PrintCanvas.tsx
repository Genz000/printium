import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  useToolcraftMediaPresentationUrls, useToolcraftPipelinePass, useToolcraftProductSceneFrame,
  useToolcraftSelector, useToolcraftViewportInteractionActive,
} from "@/toolcraft/runtime/react";

import { PrintRenderer } from "./print-gl";
import { framePass, sourcePass } from "./print-pipeline";
import { backingScale, readPrintSettings } from "./print-settings";
import { imageSource, loadSource, sourceKey, type PrintSource } from "./print-source";
import styles from "./print.module.css";

export function PrintCanvas() {
  const frame = useToolcraftProductSceneFrame();
  const values = useToolcraftSelector((state) => state.values);
  const media = useToolcraftSelector((state) => state.mediaAssets);
  const zoom = useToolcraftSelector((state) => state.canvas.zoom);
  const viewportActive = useToolcraftViewportInteractionActive();
  const settings = useMemo(() => readPrintSettings(values), [values]);

  const source = useMemo(() => imageSource(media), [media]);
  const urls = useToolcraftMediaPresentationUrls(media);
  const url = source ? urls.get(source.id) : undefined;
  const key = source && url ? sourceKey(source, settings.cutout, settings.tolerance) : "none";
  const loaded = useToolcraftPipelinePass(sourcePass, { resources: key }, () =>
    source && url ? loadSource(source, url, settings.cutout, settings.tolerance) : null);
  // Keep showing the previous cut-out while a new tolerance is computed.
  const lastSource = useRef<PrintSource | null>(null);
  const current = readLoaded(loaded);
  if (current || !source) lastSource.current = current;
  const printSource = source ? lastSource.current : null;

  const rect = frame.kind === "ready" ? frame.rect : null;
  // Backing follows the on-screen size at 2x so the browser averages 2x2 samples per screen pixel.
  // During a pan/zoom gesture the previous resolution is kept to avoid reallocating.
  const heldScale = useRef(0);
  const liveScale = rect ? backingScale(rect.width, rect.height, zoom / 100, globalThis.devicePixelRatio || 1) : 0;
  if (!viewportActive || !heldScale.current) heldScale.current = liveScale;
  const scale = heldScale.current;
  const backingW = rect ? Math.round(rect.width * scale) : 0;
  const backingH = rect ? Math.round(rect.height * scale) : 0;
  const frameKey = `${backingW}x${backingH}#${rect?.width}x${rect?.height}#${printSource?.key ?? ""}#${JSON.stringify(settings)}`;
  const drawn = useToolcraftPipelinePass(framePass, { frame: frameKey }, () => frameKey);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PrintRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !backingW || !rect) return;
    try {
      rendererRef.current ??= new PrintRenderer(canvas);
      rendererRef.current.setSource(printSource);
      rendererRef.current.render(settings, rect.width, rect.height, backingW, backingH);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "WebGL failed to start.");
    }
  }, [settings, backingW, backingH, printSource, rect?.width, rect?.height]);

  useEffect(() => () => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
  }, []);

  if (!rect) return null;
  return (
    <canvas
      ref={canvasRef}
      className={styles.output}
      data-testid="print-output"
      data-toolcraft-product-output=""
      data-frame-ready={drawn.status === "success" && !error ? "true" : "false"}
      data-image-ready={source ? (printSource ? "true" : "false") : "none"}
      data-error={error ?? undefined}
      aria-label={error ? `Print preview unavailable: ${error}` : "Retro print preview"}
    />
  );
}

function readLoaded(state: { status: string; result?: unknown }) {
  return state.status === "success" ? (state.result as PrintSource | null) : null;
}
