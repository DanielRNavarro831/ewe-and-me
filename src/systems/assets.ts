import Phaser from 'phaser';
import overrides from 'virtual:asset-overrides';
import { SPRITES, AUDIO, type SpriteAsset } from '../data/assets';
import { buildPlaceholders } from '../art/placeholders';
import { PALETTE, TRANSPARENT } from '../art/palette';
import type { PixelMap } from '../art/grid';

export type AssetSource = 'override' | 'placeholder' | 'missing';

/** Which source each asset key ended up using; shown on the asset debug screen. */
export const assetStatus = new Map<string, AssetSource>();

const overrideSprites = new Set(overrides.sprites);
const iconUrls = new Map<string, string>();

export function spriteOverrideUrl(key: string): string {
  return `assets/sprites/${key}.png`;
}

export function hasSpriteOverride(key: string): boolean {
  return overrideSprites.has(key);
}

export function hasAudioOverride(kind: 'sfx' | 'music', key: string): boolean {
  return (kind === 'sfx' ? overrides.sfx : overrides.music).includes(key);
}

/** Queue override PNGs in a scene's preload(). */
export function preloadOverrides(scene: Phaser.Scene): void {
  for (const a of SPRITES) {
    if (overrideSprites.has(a.key)) {
      scene.load.spritesheet(a.key, spriteOverrideUrl(a.key), { frameWidth: a.w, frameHeight: a.h });
    }
  }
}

/** Draws a frame strip onto a canvas, 1 canvas pixel per art pixel (optionally scaled). */
export function drawStrip(frames: PixelMap[], w: number, h: number, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w * frames.length * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  frames.forEach((frame, fi) => {
    for (let y = 0; y < h; y++) {
      const row = frame[y] ?? '';
      for (let x = 0; x < w; x++) {
        const ch = row[x] ?? '.';
        if (TRANSPARENT.has(ch)) continue;
        const color = PALETTE[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect((fi * w + x) * scale, y * scale, scale, scale);
      }
    }
  });
  return canvas;
}

/**
 * Registers a texture for every sprite in the manifest: the override PNG if one
 * loaded, otherwise the code-drawn placeholder.
 */
export function registerSprites(scene: Phaser.Scene): void {
  const placeholders = buildPlaceholders();
  for (const a of SPRITES) {
    if (overrideSprites.has(a.key) && scene.textures.exists(a.key)) {
      checkOverrideSize(scene, a);
      assetStatus.set(a.key, 'override');
      continue;
    }
    const frames = placeholders[a.key];
    if (!frames) {
      console.warn(`[assets] no placeholder for "${a.key}"`);
      assetStatus.set(a.key, 'missing');
      continue;
    }
    if (import.meta.env.DEV) validateFrames(a, frames);
    const canvas = drawStrip(frames, a.w, a.h);
    const tex = scene.textures.addCanvas(a.key, canvas)!;
    frames.forEach((_, i) => tex.add(i, 0, i * a.w, 0, a.w, a.h));
    assetStatus.set(a.key, 'placeholder');
  }
  for (const a of AUDIO) {
    assetStatus.set(`${a.kind}:${a.key}`, hasAudioOverride(a.kind, a.key) ? 'override' : 'placeholder');
  }
}

/** A crisp data URL of a sprite's first frame, for use in DOM UI (tab bar, panels). */
export function spriteDataUrl(scene: Phaser.Scene, key: string, scale = 4): string {
  const cached = iconUrls.get(key);
  if (cached) return cached;
  const a = SPRITES.find((s) => s.key === key);
  if (!a) return '';
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement('canvas');
  canvas.width = a.w * scale;
  canvas.height = a.h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, a.w, a.h, 0, 0, a.w * scale, a.h * scale);
  const url = canvas.toDataURL();
  iconUrls.set(key, url);
  return url;
}

function checkOverrideSize(scene: Phaser.Scene, a: SpriteAsset): void {
  const img = scene.textures.get(a.key).getSourceImage() as HTMLImageElement;
  if (img.width !== a.w * a.frames || img.height !== a.h) {
    console.warn(`[assets] ${a.key}.png is ${img.width}x${img.height}; expected ${a.w * a.frames}x${a.h} (${a.frames} frames of ${a.w}x${a.h}).`);
  }
}

function validateFrames(a: SpriteAsset, frames: PixelMap[]): void {
  if (frames.length !== a.frames) console.warn(`[assets] ${a.key}: ${frames.length} frames, manifest says ${a.frames}`);
  frames.forEach((f, i) => {
    if (f.length !== a.h) console.warn(`[assets] ${a.key} frame ${i}: ${f.length} rows, expected ${a.h}`);
    f.forEach((row, y) => {
      if (row.length !== a.w) console.warn(`[assets] ${a.key} frame ${i} row ${y}: ${row.length} wide, expected ${a.w}`);
      for (const ch of row) if (!TRANSPARENT.has(ch) && !PALETTE[ch]) console.warn(`[assets] ${a.key}: unknown palette key "${ch}"`);
    });
  });
}
