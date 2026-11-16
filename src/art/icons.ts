import { Grid, type PixelMap } from './grid';

/**
 * 16x16 tab and UI icons. Everything stays inside a 1px margin so each icon
 * gets a full dark outline ('o'), matching the characters.
 */

export function iconRanch(): PixelMap {
  const g = new Grid(16, 16);
  g.rect(1, 6, 2, 2, 'l').rect(13, 6, 2, 2, 'l'); // ears
  g.ellipse(7.5, 8, 5.5, 5, 'f');
  g.ellipse(7.5, 9.5, 3.2, 3.4, 'l');
  g.set(6, 8, 'o').set(9, 8, 'o');
  g.set(5, 10, 'x').set(10, 10, 'x');
  g.set(7, 11, 'm').set(8, 11, 'm');
  g.outline('o');
  return g.rows();
}

export function iconWorkshop(): PixelMap {
  // spinning wheel
  const g = new Grid(16, 16);
  g.line(4, 14, 6, 11, 'W').line(11, 14, 9, 11, 'W');
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2;
    g.line(7, 7, 7 + Math.cos(ang) * 4.5, 7 + Math.sin(ang) * 4.5, 'L');
  }
  g.ring(7, 7, 5, 'W');
  g.set(7, 7, 'D');
  g.rect(12, 2, 2, 3, 'y'); // bobbin of mustard yarn
  g.outline('o');
  return g.rows();
}

export function iconDye(): PixelMap {
  const g = new Grid(16, 16);
  g.rect(2, 6, 12, 8, 'n');
  g.rect(1, 5, 14, 1, 'm');
  g.rect(3, 5, 10, 1, 't');
  g.rect(1, 7, 1, 2, 'm').rect(14, 7, 1, 2, 'm');
  g.rect(4, 8, 1, 4, 'm');
  g.outline('o');
  // steam bubbles sit outside the outline so they stay light
  g.set(5, 2, 'b').set(9, 1, 'b').set(11, 3, 'b').set(7, 3, 'b');
  return g.rows();
}

export function iconShop(): PixelMap {
  const g = new Grid(16, 16);
  g.rect(2, 6, 12, 8, 'L');
  for (let x = 1; x < 15; x++) g.rect(x, 2, 1, 3, Math.floor((x - 1) / 2) % 2 === 0 ? 'x' : 'w');
  g.rect(1, 5, 14, 1, 'D');
  g.rect(9, 9, 3, 5, 'D');
  g.rect(3, 8, 4, 3, 'b');
  g.set(10, 11, 'y');
  g.outline('o');
  return g.rows();
}

export function iconStash(): PixelMap {
  // a ball of yarn
  const g = new Grid(16, 16);
  g.ellipse(7, 7, 5.5, 5.5, 't');
  g.line(3, 4, 9, 12, 'b').line(5, 2, 11, 10, 'b').line(2, 8, 6, 12, 'b');
  g.line(9, 2, 4, 12, 'B');
  g.line(11, 12, 13, 14, 't');
  g.outline('o');
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
  g.ellipse(7.5, 7.5, 4.5, 4.5, 'g');
  for (const [x, y] of [[7, 1], [7, 12], [1, 7], [12, 7], [3, 3], [11, 3], [3, 11], [11, 11]] as const) {
    g.rect(x, y, 2, 2, 'g');
  }
  g.ellipse(7.5, 7.5, 1.6, 1.6, '.');
  g.outline('o');
  return g.rows();
}
