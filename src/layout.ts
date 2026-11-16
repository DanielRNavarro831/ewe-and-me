/**
 * Pixel-perfect scaling. The game is 270 logical pixels wide; its height adapts
 * to the screen. It's drawn at a whole-number scale in *physical* pixels
 * (4x on a Pixel), so every art pixel is a crisp square.
 */

export const LOGICAL_WIDTH = 270;

export interface Layout {
  /** Logical game size. */
  width: number;
  height: number;
  /** Whole-number physical scale. */
  scale: number;
  /** Size of the canvas in CSS pixels. */
  cssWidth: number;
  cssHeight: number;
}

export function computeLayout(areaCssW: number, areaCssH: number): Layout {
  const dpr = window.devicePixelRatio || 1;
  // On a wide desktop window, use a phone-shaped column for testing.
  const landscape = areaCssW > areaCssH;
  const availW = landscape ? Math.min(areaCssW, areaCssH * 0.62) : areaCssW;
  let scale = Math.max(1, Math.floor((availW * dpr) / LOGICAL_WIDTH));
  // Keep at least ~360 logical pixels of height so rooms fit.
  while (scale > 1 && (areaCssH * dpr) / scale < 360) scale--;
  const height = Math.max(240, Math.floor((areaCssH * dpr) / scale));
  return {
    width: LOGICAL_WIDTH,
    height,
    scale,
    cssWidth: (LOGICAL_WIDTH * scale) / dpr,
    cssHeight: (height * scale) / dpr,
  };
}
