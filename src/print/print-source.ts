import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import { cutout as removeBackground } from "./print-cutout";
import { IMAGE_TARGET } from "./print-settings";

/** Longest edge the source is decoded at. The print pattern is procedural, so this only limits tonal detail. */
export const SOURCE_MAX_EDGE = 2048;

export type SourceTransform = { flipHorizontal: boolean; flipVertical: boolean; rotationDeg: number };
export type ImageSource = { id: string; resourceRef: string; transform: SourceTransform };
/** Decoded, transformed, optionally cut-out pixels ready for the texture. */
export type PrintSource = { key: string; width: number; height: number; pixels: Uint8Array };

type Decoded = { width: number; height: number; rgba: Uint8Array };

export function imageSource(media: readonly ToolcraftMediaAsset[]): ImageSource | null {
  const asset = media.find((a) => a.sourceTarget === IMAGE_TARGET && a.assetKind === "image" && a.lifecycle === "ready");
  if (!asset || asset.assetKind !== "image") return null;
  const t = asset.transform;
  return {
    id: asset.id,
    resourceRef: asset.resourceRef,
    transform: { flipHorizontal: !!t?.flipHorizontal, flipVertical: !!t?.flipVertical, rotationDeg: t?.rotationDeg ?? 0 },
  };
}

const transformKey = (t: SourceTransform) => `${t.rotationDeg}${t.flipHorizontal ? "h" : ""}${t.flipVertical ? "v" : ""}`;

export function sourceKey(source: ImageSource, cutout: boolean, tolerance: number): string {
  return `${source.resourceRef}|${transformKey(source.transform)}|${cutout ? Math.round(tolerance) : "keep"}`;
}

const decodes = new Map<string, Promise<Decoded>>();
const ready = new Map<string, PrintSource>();

/** Decodes each resource and orientation once; changing tolerance only reruns the cut-out. */
export async function loadSource(source: ImageSource, url: string, cutout: boolean, tolerance: number): Promise<PrintSource> {
  const key = sourceKey(source, cutout, tolerance);
  const hit = ready.get(key);
  if (hit) return hit;
  const decodeKey = `${source.resourceRef}|${transformKey(source.transform)}`;
  let pending = decodes.get(decodeKey);
  if (!pending) {
    pending = decode(url, source.transform);
    pending.catch(() => decodes.delete(decodeKey));
    decodes.set(decodeKey, pending);
  }
  const decoded = await pending;
  let pixels = decoded.rgba;
  if (cutout) {
    pixels = new Uint8Array(decoded.rgba);
    removeBackground(pixels, decoded.width, decoded.height, tolerance);
  }
  const result: PrintSource = { key, width: decoded.width, height: decoded.height, pixels };
  if (ready.size > 8) ready.clear();
  ready.set(key, result);
  return result;
}

export const cachedSource = (source: ImageSource | null, cutout: boolean, tolerance: number) =>
  (source ? ready.get(sourceKey(source, cutout, tolerance)) ?? null : null);

/** Decodes through an image element so SVG files rasterise too, then applies the runtime's rotate/flip. */
async function decode(url: string, transform: SourceTransform): Promise<Decoded> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const iw = image.naturalWidth || SOURCE_MAX_EDGE;
  const ih = image.naturalHeight || SOURCE_MAX_EDGE;
  const k = Math.min(1, SOURCE_MAX_EDGE / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k));
  const h = Math.max(1, Math.round(ih * k));
  const quarter = transform.rotationDeg === 90 || transform.rotationDeg === 270;
  const width = quarter ? h : w;
  const height = quarter ? w : h;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((transform.rotationDeg * Math.PI) / 180);
  ctx.scale(transform.flipHorizontal ? -1 : 1, transform.flipVertical ? -1 : 1);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  const data = ctx.getImageData(0, 0, width, height).data;
  return { width, height, rgba: new Uint8Array(data.buffer, data.byteOffset, data.length) };
}
