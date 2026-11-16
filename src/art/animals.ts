import { Grid, seeded, recolor, type PixelMap } from './grid';

/**
 * Sheep, 24x20, facing right. Four fleece stages:
 * 0 shorn, 1 one-third, 2 two-thirds, 3 full and fluffy.
 * `face` is the face/leg color key, so breeds can differ (Merino has a light face).
 */
export function sheepFrame(stage: 0 | 1 | 2 | 3, grazing: boolean, face = 'l', fleece = 'f', fleeceShade = 'F'): PixelMap {
  const g = new Grid(24, 20);
  const legC = 'n';
  // legs
  for (const lx of [7, 9, 14, 16]) {
    g.rect(lx, 14, 1, 4, legC);
    g.set(lx, 18, 'o');
  }
  // body
  const rx = [5.5, 6.5, 7.5, 8.8][stage];
  const ry = [3.6, 4.3, 5.0, 5.8][stage];
  const cx = 11.5;
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
  // fluffy scallops on top edge for fuller stages
  if (stage >= 2) {
    for (let x = Math.ceil(cx - rx + 2); x < cx + rx - 1; x += 3) {
      g.set(x, Math.round(cy - ry) - 1, fleece);
    }
  }
  g.outline('g');
  // head
  const hy = grazing ? 10 : 7;
  const hx = 19 + (stage === 3 ? 1 : 0);
  const head = new Grid(24, 20);
  head.ellipse(hx, hy, 2.6, 2.4, face);
  head.rect(hx + 1, hy + 1, 2, 2, face); // muzzle
  head.set(hx + 3, hy + 2, 'm'); // nose
  head.set(hx + 1, hy - 1, 'o'); // eye
  head.outline('m');
  head.set(hx - 2, hy - 2, 'm'); // ear
  head.set(hx - 3, hy - 2, face);
  head.set(hx - 3, hy - 3, 'm');
  if (stage >= 1) {
    // fleece topknot
    head.set(hx - 1, hy - 3, fleece);
    head.set(hx, hy - 3, fleece);
  }
  g.stamp(head, 0, 0);
  return g.rows();
}

export function sheepFrames(face = 'l', fleece = 'f', fleeceShade = 'F'): Record<string, PixelMap[]> {
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
