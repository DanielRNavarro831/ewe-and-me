/**
 * The game's sprite palette (from the design doc). Every code-drawn pixel map
 * uses these single-character keys. '.' (or ' ') is transparent.
 * Dyed yarn colors are computed at runtime and are the one exception.
 */
export const PALETTE: Record<string, string> = {
  // Outline and neutrals (warm; never pure black)
  o: '#2B1E1E',
  n: '#4A3B3B',
  m: '#6E5A55',
  g: '#9C8780',
  l: '#C9B8AE',
  w: '#F3EAE0',
  // Wood
  D: '#5C3A21',
  W: '#8A5A35',
  L: '#B7814F',
  // Grass
  G: '#3F6B3A',
  h: '#5E9149',
  H: '#8DBF5F',
  // Sky and water
  B: '#4E7FA3',
  b: '#8BBBD9',
  // Fleece
  f: '#FFF8EC',
  F: '#E6DCCB',
  // Skin: Madhu
  s: '#6B4226',
  S: '#4A2C17',
  // Skin: Daniel
  p: '#F2C9A8',
  P: '#D9A585',
  // Hair: Madhu
  k: '#1A1414',
  K: '#3A2E2E',
  // Hair: Daniel
  r: '#3B2A1E',
  R: '#5A4130',
  // Cats
  c: '#E8892B',
  C: '#B85E1A',
  e: '#F6D7A7',
  // Accents
  y: '#D9A43A', // mustard
  t: '#2F8C8C', // teal
  x: '#D9767A', // rose
  v: '#9C88C2', // lavender
};

export const TRANSPARENT = new Set(['.', ' ']);

/** Palette color as a 0xRRGGBB number, for Phaser fills and tints. */
export function hex(key: keyof typeof PALETTE | string): number {
  const c = PALETTE[key] ?? key;
  return parseInt(c.replace('#', ''), 16);
}
