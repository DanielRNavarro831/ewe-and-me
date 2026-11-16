import { Grid, type PixelMap } from './grid';

/** 16x16 tab and UI icons. */

export function iconRanch(): PixelMap {
  const g = new Grid(16, 16);
  g.ellipse(7.5, 8, 6, 5, 'f');
  g.ellipse(7.5, 9.5, 3.2, 3.6, 'l');
  g.set(6, 8, 'o').set(9, 8, 'o');
  g.set(7, 11, 'm').set(8, 11, 'm');
  g.rect(0, 6, 2, 2, 'l').rect(14, 6, 2, 2, 'l');
  g.outline('m');
  return g.rows();
}

export function iconWorkshop(): PixelMap {
  // spinning wheel
  const g = new Grid(16, 16);
  g.ring(7.5, 7, 5.5, 'W');
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    g.line(7.5, 7, 7.5 + Math.cos(ang) * 5, 7 + Math.sin(ang) * 5, 'L');
  }
  g.set(7, 7, 'D').set(8, 7, 'D');
  g.line(3, 15, 6, 11, 'D').line(12, 15, 9, 11, 'D');
  g.rect(12, 2, 2, 3, 'y'); // bobbin of mustard yarn
  return g.rows();
}

export function iconDye(): PixelMap {
  const g = new Grid(16, 16);
  g.rect(2, 6, 12, 8, 'n');
  g.rect(3, 6, 10, 2, 't');
  g.rect(1, 5, 14, 1, 'm');
  g.rect(0, 7, 2, 1, 'm').rect(14, 7, 2, 1, 'm');
  g.set(5, 3, 'b').set(9, 2, 'b').set(11, 4, 'b').set(7, 4, 'b');
  g.rect(3, 14, 10, 1, 'o');
  g.set(4, 9, 'm').set(4, 10, 'm');
  return g.rows();
}

export function iconShop(): PixelMap {
  const g = new Grid(16, 16);
  g.rect(1, 6, 14, 9, 'L');
  for (let x = 0; x < 16; x++) g.rect(x, 2, 1, 4, Math.floor(x / 2) % 2 === 0 ? 'x' : 'w');
  g.rect(0, 5, 16, 1, 'D');
  g.rect(9, 9, 4, 6, 'D');
  g.rect(3, 8, 4, 4, 'b').strokeRect(3, 8, 4, 4, 'D');
  g.set(11, 12, 'y');
  g.rect(1, 15, 14, 1, 'o');
  return g.rows();
}

export function iconStash(): PixelMap {
  // a ball of yarn
  const g = new Grid(16, 16);
  g.ellipse(7.5, 8, 6, 6, 't');
  g.line(3, 4, 10, 13, 'b').line(5, 3, 12, 12, 'b').line(2, 8, 7, 14, 'b');
  g.line(10, 3, 4, 13, 'B');
  g.outline('o');
  g.line(13, 13, 15, 15, 't');
  return g.rows();
}

export function iconCollection(): PixelMap {
  // an open book
  const g = new Grid(16, 16);
  g.rect(1, 3, 7, 10, 'w').rect(8, 3, 7, 10, 'w');
  g.rect(7, 3, 2, 11, 'v');
  for (let y = 5; y < 12; y += 2) {
    g.rect(2, y, 4, 1, 'l');
    g.rect(10, y, 4, 1, 'l');
  }
  g.rect(1, 13, 14, 1, 'v');
  g.outline('o');
  return g.rows();
}

export function iconSettings(): PixelMap {
  const g = new Grid(16, 16);
  g.ellipse(7.5, 7.5, 5, 5, 'g');
  for (const [x, y] of [[7, 0], [7, 13], [0, 7], [13, 7], [2, 2], [12, 2], [2, 12], [12, 12]] as const) {
    g.rect(x, y, 2, 2, 'g');
  }
  g.ellipse(7.5, 7.5, 2, 2, '.');
  g.outline('n');
  return g.rows();
}
