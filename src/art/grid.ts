import { TRANSPARENT } from './palette';

/** A frame is a list of rows; each character is a palette key. */
export type PixelMap = string[];

/**
 * A small pixel canvas for building sprites in code: shapes, outlines,
 * mirroring. Produces PixelMaps (rows of palette characters).
 */
export class Grid {
  readonly cells: string[][];

  constructor(readonly w: number, readonly h: number, fill = '.') {
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  static from(map: PixelMap, w?: number, h?: number): Grid {
    const width = w ?? Math.max(...map.map((r) => r.length));
    const height = h ?? map.length;
    const g = new Grid(width, height);
    for (let y = 0; y < height; y++) {
      const row = map[y] ?? '';
      for (let x = 0; x < width; x++) g.cells[y][x] = row[x] ?? '.';
    }
    return g;
  }

  clone(): Grid {
    return Grid.from(this.rows(), this.w, this.h);
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '.';
    return this.cells[y][x];
  }

  set(x: number, y: number, c: string): this {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = c;
    return this;
  }

  filled(x: number, y: number): boolean {
    return !TRANSPARENT.has(this.get(x, y));
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }

  strokeRect(x: number, y: number, w: number, h: number, c: string): this {
    for (let i = x; i < x + w; i++) {
      this.set(i, y, c);
      this.set(i, y + h - 1, c);
    }
    for (let j = y; j < y + h; j++) {
      this.set(x, j, c);
      this.set(x + w - 1, j, c);
    }
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string | ((x: number, y: number) => string)): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
      }
    }
    return this;
  }

  ring(cx: number, cy: number, r: number, c: string): this {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (Math.abs(d - r) < 0.5) this.set(x, y, c);
      }
    }
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Draws another map on top (transparent pixels skipped). */
  stamp(map: PixelMap | Grid, ox: number, oy: number): this {
    const g = map instanceof Grid ? map : Grid.from(map);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.cells[y][x];
      if (!TRANSPARENT.has(c)) this.set(ox + x, oy + y, c);
    }
    return this;
  }

  /** Adds a 1px outline around filled pixels (4-neighbour). */
  outline(c: string): this {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.filled(x, y)) continue;
      if (this.filled(x - 1, y) || this.filled(x + 1, y) || this.filled(x, y - 1) || this.filled(x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
    return this;
  }

  replace(from: string, to: string): this {
    for (const row of this.cells) for (let i = 0; i < row.length; i++) if (row[i] === from) row[i] = to;
    return this;
  }

  shift(dx: number, dy: number): this {
    const src = this.clone();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.cells[y][x] = src.get(x - dx, y - dy);
    return this;
  }

  mirror(): this {
    for (const row of this.cells) row.reverse();
    return this;
  }

  rows(): PixelMap {
    return this.cells.map((r) => r.join(''));
  }
}

/** Deterministic pseudo-random numbers, so code-drawn art is the same every launch. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Swap palette keys across a map, e.g. to recolor a template. */
export function recolor(map: PixelMap, swaps: Record<string, string>): PixelMap {
  return map.map((row) => [...row].map((ch) => swaps[ch] ?? ch).join(''));
}
