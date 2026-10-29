/** Pure background-removal math: no DOM, only arrays. */

/**
 * Background mask by flood fill from the image border: a pixel belongs to the background
 * when it is near white (every channel at least 255 - tolerance) or almost transparent,
 * and it connects to the border through such pixels. White highlights inside the object
 * are not connected to the border, so they stay. The removed area is then grown by one pixel
 * to drop the light halo of anti-aliased edges. Removed pixels get alpha 0, in place.
 */
export function cutout(rgba: Uint8Array, width: number, height: number, tolerance: number): void {
  const count = width * height;
  const floor = 255 - Math.max(0, Math.min(255, tolerance));
  const keep = new Uint8Array(count);
  for (let i = 0; i < count; i++) keep[i] = 255;
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;
  const isBackground = (i: number) => {
    const o = i * 4;
    return rgba[o + 3] < 16 || (rgba[o] >= floor && rgba[o + 1] >= floor && rgba[o + 2] >= floor);
  };
  const visit = (i: number) => {
    if (keep[i] === 0 || !isBackground(i)) return;
    keep[i] = 0;
    queue[tail] = i;
    tail += 1;
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head];
    head += 1;
    const x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < count - width) visit(i + width);
  }
  // Decide every pixel from the fill result before writing any alpha.
  for (let i = 0; i < count; i++) {
    const x = i % width;
    const removed = keep[i] === 0 || (x > 0 && keep[i - 1] === 0) || (x < width - 1 && keep[i + 1] === 0)
      || (i >= width && keep[i - width] === 0) || (i < count - width && keep[i + width] === 0);
    if (removed) rgba[i * 4 + 3] = 0;
  }
}
