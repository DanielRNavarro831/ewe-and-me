import { Grid, seeded, type PixelMap } from './grid';

export function grassTile(seed = 1): PixelMap {
  const r = seeded(seed);
  const g = new Grid(16, 16, 'h');
  for (let i = 0; i < 22; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.5 ? 'G' : 'H');
  // a couple of tufts
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(r() * 14) + 1;
    const y = Math.floor(r() * 13) + 2;
    g.set(x, y, 'H').set(x - 1, y + 1, 'H').set(x + 1, y + 1, 'H').set(x, y + 1, 'G');
  }
  return g.rows();
}

export function woodFloorTile(): PixelMap {
  const g = new Grid(16, 16, 'W');
  for (let y = 0; y < 16; y++) {
    if (y % 4 === 3) g.rect(0, y, 16, 1, 'D');
    if (y % 4 === 0) g.rect(0, y, 16, 1, 'L');
  }
  // staggered plank ends
  for (let band = 0; band < 4; band++) {
    const x = band % 2 === 0 ? 5 : 12;
    g.rect(x, band * 4, 1, 3, 'D');
  }
  g.set(9, 1, 'D').set(2, 9, 'D').set(14, 13, 'L');
  return g.rows();
}

export function wallTile(base: string, stripe: string): PixelMap {
  const g = new Grid(16, 16, base);
  for (let x = 0; x < 16; x += 4) g.rect(x, 0, 1, 16, stripe);
  for (let y = 2; y < 16; y += 6) g.set(2, y, stripe).set(10, y + 3, stripe);
  return g.rows();
}

export function dirtPathTile(seed = 3): PixelMap {
  const r = seeded(seed);
  const g = new Grid(16, 16, 'L');
  for (let i = 0; i < 18; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), r() < 0.6 ? 'W' : 'l');
  return g.rows();
}

export function fenceTile(): PixelMap {
  const g = new Grid(16, 16);
  g.rect(0, 5, 16, 2, 'L').rect(0, 7, 16, 1, 'W');
  g.rect(0, 10, 16, 2, 'L').rect(0, 12, 16, 1, 'W');
  g.rect(2, 2, 3, 13, 'L').rect(4, 2, 1, 13, 'W');
  g.set(3, 2, 'w');
  g.outline('D');
  return g.rows();
}

export function windowSprite(): PixelMap {
  // 24x20 window; panes are transparent-ish sky that the scene tints by time of day.
  const g = new Grid(24, 20);
  g.rect(0, 0, 24, 20, 'W');
  g.rect(2, 2, 9, 15, 'b').rect(13, 2, 9, 15, 'b');
  g.rect(2, 12, 9, 5, 'H').rect(13, 12, 9, 5, 'H');
  g.rect(3, 3, 2, 1, 'w').rect(14, 3, 2, 1, 'w');
  g.rect(0, 17, 24, 3, 'L');
  g.strokeRect(0, 0, 24, 20, 'D');
  return g.rows();
}
