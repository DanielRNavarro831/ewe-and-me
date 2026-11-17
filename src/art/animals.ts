import { Grid, seeded, recolor, type PixelMap } from './grid';

/**
 * Sheep, 24x20, facing right, in the same cute style as Madhu: a big round
 * head, a sparkly eye, a rosy cheek and a dark warm outline. Four fleece stages:
 * 0 shorn, 1 one-third, 2 two-thirds, 3 full and fluffy.
 * `face` is the face/leg color key, so breeds can differ (Merino has a light face).
 */
export function sheepFrame(stage: 0 | 1 | 2 | 3, grazing: boolean, face = 'F', fleece = 'f', fleeceShade = 'F'): PixelMap {
  const g = new Grid(24, 20);
  // two pairs of legs, two pixels wide with clear gaps
  for (const lx of [6, 14]) {
    g.rect(lx, 14, 2, 4, 'l');
    g.rect(lx, 17, 2, 1, 'm'); // hooves
  }
  // body
  const rx = [5.6, 6.6, 7.6, 8.8][stage];
  const ry = [3.8, 4.4, 5.1, 5.8][stage];
  const cx = 11;
  const cy = 10.5 - (stage === 3 ? 0.5 : 0);
  const rand = seeded(7 + stage);
  const bumps = new Map<string, boolean>();
  g.ellipse(cx, cy, rx, ry, (x, y) => {
    if (stage === 0) return y > cy + 1 ? 'l' : 'F';
    const key = `${x},${y}`;
    if (!bumps.has(key)) bumps.set(key, rand() < 0.28);
    const shade = y > cy + ry * 0.35 || bumps.get(key);
    return shade ? fleeceShade : fleece;
  });
  // soft fluffy bumps along the back for fuller stages (2px wide so they read as curls, not spikes)
  if (stage >= 2) {
    const top = Math.round(cy - ry);
    for (let x = Math.ceil(cx - rx + 2); x < cx + rx - 3; x += 4) {
      g.rect(x, top - 1, 2, 1, fleece);
    }
  }
  g.outline('o');

  // head
  const hx = 19;
  const hy = grazing ? 11 : 7;
  const head = new Grid(24, 20);
  head.set(hx - 4, hy - 1, face).set(hx - 3, hy - 1, face).set(hx - 3, hy, 'x'); // ear with a pink inside
  head.ellipse(hx, hy, 3.3, 3, face);
  head.rect(hx + 1, hy + 1, 3, 2, face); // muzzle
  head.set(hx + 3, hy + 1, 'm'); // nose
  head.set(hx, hy - 1, 'w').set(hx + 1, hy - 1, 'o').set(hx, hy, 'o').set(hx + 1, hy, 'o'); // sparkly eye
  head.set(hx - 1, hy + 1, 'x'); // rosy cheek
  if (stage >= 1) head.rect(hx - 2, hy - 3, 3, 1, fleece); // fleece topknot
  head.outline('o');
  g.stamp(head, 0, 0);
  return g.rows();
}

export function sheepFrames(face = 'F', fleece = 'f', fleeceShade = 'F'): Record<string, PixelMap[]> {
  const stages = [0, 1, 2, 3] as const;
  const out: Record<string, PixelMap[]> = {};
  for (const s of stages) {
    out[`sheep_merino_stage${s}`] = [sheepFrame(s, false, face, fleece, fleeceShade), sheepFrame(s, true, face, fleece, fleeceShade)];
  }
  return out;
}

/**
 * Cats, 16x12, sitting and facing the viewer.
 * Iroh: larger and rounder; his left ear (viewer's right) is snipped at the tip.
 * Mango: smaller and slimmer with a lighter cream muzzle and light-green eyes.
 */
// Cute style: big eyes with a sparkle and rosy cheeks.
const IROH_SIT: PixelMap = [
  '..o.........oo..', // left ear (viewer's right) snipped flat
  '..oco......oco..',
  '..occoooooocco..',
  '.occCccccccCcco.',
  '.occowccccowcco.',
  '.occyyccccyycco.', // amber eyes
  '.oxceeexxeeecxo.',
  '..occeeeeeecco..',
  '..ocCcceecCcco..',
  '.occcceeeecccoCo',
  '.occcceeeecccoCo',
  '..oeeooooooeeo..',
];

const MANGO_SIT: PixelMap = [
  '................',
  '...o........o...',
  '...oco....oco...',
  '...occoooocco...',
  '..ocowccccowco..',
  '..ocHHccccHHco..', // light-green eyes
  '..oxcffxxffcxo..', // lighter cream muzzle
  '...occffffcco...',
  '....ocCffCco....',
  '....occffcco....',
  '....occffccoCo..',
  '.....offoffo....',
];

/** Closes the eyes: iris and sparkle become fur, leaving a soft lash line. */
function blink(map: PixelMap, eye: string): PixelMap {
  return recolor(map, { [eye]: 'C', w: 'c' });
}

/** Sleeping loaf pose, generated from the palette so both cats share a shape. */
function sleepFrame(big: boolean, muzzle: string): PixelMap {
  const g = new Grid(16, 12);
  const rx = big ? 6.5 : 5.5;
  g.ellipse(8, 8, rx, big ? 3.6 : 3.1, (x, y) => ((x + y) % 4 === 0 ? 'C' : 'c'));
  g.ellipse(big ? 3.5 : 4.5, 7, 2.6, 2.3, 'c');
  g.set(big ? 3 : 4, 8, muzzle).set(big ? 4 : 5, 8, muzzle);
  g.line(big ? 2 : 3, 7, big ? 3 : 4, 7, 'C'); // closed eye
  g.set(big ? 5 : 6, 8, 'x'); // rosy cheek
  g.outline('o');
  g.set(13, 10, 'C').set(14, 10, 'C').set(14, 9, 'C'); // tail curl
  return g.rows();
}

export function catFrames(): Record<string, PixelMap[]> {
  return {
    cat_iroh_idle: [IROH_SIT, blink(IROH_SIT, 'y')],
    cat_iroh_sleep: [sleepFrame(true, 'e'), sleepFrame(true, 'e')],
    cat_mango_idle: [MANGO_SIT, blink(MANGO_SIT, 'H')],
    cat_mango_sleep: [sleepFrame(false, 'f'), sleepFrame(false, 'f')],
  };
}
