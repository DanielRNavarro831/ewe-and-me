import type { DyeAmounts } from '../data/dyes';
import { HUE_NOUNS, PASTEL_WORDS, DEEP_WORDS, MUTED_WORDS, BRIGHT_WORDS, NEUTRAL_NAMES } from '../data/colorNames';

/**
 * Dye color math.
 *  - Dye amounts are red, yellow and blue weights, converted to RGB with RYB
 *    cube interpolation, so red + yellow gives orange and blue + yellow gives
 *    green, as painters and dyers expect.
 *  - Total depth of shade sets depth: the color blends from the fiber's base
 *    color toward the mix as DOS rises.
 *  - Overdyeing natural colors multiplies by the base color.
 *  - Lustrous fibers get about +10% saturation; high-crimp Merino reads softer.
 */

type RGB = [number, number, number];

// Corners of the RYB cube (Gosset & Chen), with a slightly cool red.
const C000: RGB = [1, 1, 1]; // white (no dye)
const C100: RGB = [0.86, 0.1, 0.3]; // cool red
const C010: RGB = [1, 0.9, 0.1]; // yellow
const C001: RGB = [0.16, 0.37, 0.69]; // blue
const C110: RGB = [1, 0.5, 0.05]; // red + yellow = orange
const C101: RGB = [0.45, 0.12, 0.5]; // red + blue = purple
const C011: RGB = [0.05, 0.62, 0.25]; // yellow + blue = green
const C111: RGB = [0.22, 0.12, 0.08]; // all three = brown-black

function lerp3(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Trilinear interpolation inside the RYB cube. r, y, b in 0..1. */
export function rybToRgb(r: number, y: number, b: number): RGB {
  const x00 = lerp3(C000, C100, r);
  const x10 = lerp3(C010, C110, r);
  const x01 = lerp3(C001, C101, r);
  const x11 = lerp3(C011, C111, r);
  const y0 = lerp3(x00, x10, y);
  const y1 = lerp3(x01, x11, y);
  return lerp3(y0, y1, b);
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex(c: RGB): string {
  return '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

export interface DyeColorInput {
  /** DOS % of each dye actually taken up by the fiber. */
  dos: DyeAmounts;
  /** Undyed fiber color. */
  baseHex: string;
  luster: 'low' | 'medium' | 'high';
  /** High-crimp fibers like Merino read a little softer. */
  crimp: 'low' | 'medium' | 'high' | 'very high';
}

/** The color a skein comes out of the pot. */
export function dyedColor(inp: DyeColorInput): string {
  const { red, yellow, blue, black } = inp.dos;
  const chroma = red + yellow + blue;
  const total = chroma + black;
  if (total <= 0.001) return inp.baseHex.toUpperCase();

  // hue from the proportions, normalised so the strongest dye is 1
  const m = Math.max(red, yellow, blue, 0.0001);
  let mix: RGB = chroma > 0 ? rybToRgb(red / m, yellow / m, blue / m) : [0.18, 0.16, 0.16];
  // black saddens and darkens the mix
  const k = black / total;
  mix = lerp3(mix, [0.14, 0.12, 0.13], Math.min(0.9, k * 1.1));

  // depth: 0.25% pale, 1% medium, 3–4% deep
  const depth = 1 - Math.exp(-total / 1.15);
  let c = lerp3(C000, mix, depth);

  // luster and crimp
  let [h, s, l] = rgbToHsl(c);
  if (inp.luster === 'high') s = Math.min(1, s * 1.1);
  if (inp.crimp === 'very high') s *= 0.94;
  c = hslToRgb(h, s, l);

  // overdyeing multiplies by the fiber's own color
  const base = hexToRgb(inp.baseHex);
  return rgbToHex([c[0] * base[0], c[1] * base[1], c[2] * base[2]]);
}

/**
 * Each dye lot varies a tiny, realistic amount from the next, even with the
 * same recipe. Deterministic per lot number.
 */
export function lotVariation(hex: string, lot: number): string {
  const rand = (n: number) => {
    const x = Math.sin(lot * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  };
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb((h + rand(1) * 5 + 360) % 360, Math.max(0, Math.min(1, s + rand(2) * 0.04)), Math.max(0, Math.min(1, l + rand(3) * 0.03))));
}

/** A lighter and a darker tone for kettle-dyed (tonal) skeins. */
export function tonal(hex: string): [string, string] {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return [rgbToHex(hslToRgb(h, s, Math.min(0.95, l + 0.12))), rgbToHex(hslToRgb(h, Math.min(1, s * 1.08), Math.max(0.05, l - 0.12)))];
}

function pickOne<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length];
}

/** A suggested colorway name, based on the color. */
export function suggestColorwayName(hex: string, salt = 0): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const seed = Math.floor(h) + Math.floor(l * 100) + salt * 7;
  if (s < 0.12) return pickOne(NEUTRAL_NAMES, seed);
  const noun = pickOne((HUE_NOUNS.find((x) => h < x.upTo) ?? HUE_NOUNS[0]).nouns, seed);
  if (l > 0.75) return `${pickOne(PASTEL_WORDS, seed)} ${noun}`;
  if (l < 0.32) return `${pickOne(DEEP_WORDS, seed)} ${noun}`;
  if (s < 0.35) return `${pickOne(MUTED_WORDS, seed)} ${noun}`;
  if (s > 0.7) return `${pickOne(BRIGHT_WORDS, seed)} ${noun}`;
  return noun;
}
