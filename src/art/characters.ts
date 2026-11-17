import { Grid, recolor, type PixelMap } from './grid';

/**
 * Madhu, 16x24, in a cute chibi style: big head, big sparkly eyes, rosy cheeks.
 * Each view is a 19-row top (head and body) plus 4 leg rows and a blank row.
 * Leg rows are swapped to make walk frames.
 */
const MADHU_FRONT_TOP: PixelMap = [
  '................',
  '................',
  '.....oooooo.....',
  '....okkkkkko....',
  '...okkKKkkkko...',
  '..okkKkkkkkkko..',
  '..okkkkkkkkkko..',
  '..okkkssssskko..', // side-swept fringe
  '..okssssssssko..',
  '..oksowssowsko..', // eyes with a sparkle
  '..oksoossoosko..',
  '..okxssSSssxko..', // blush and a small smile
  '..kkossssssokk..',
  '..kk.oossoo.kk..',
  '..kkoyyttyyokk..', // braid over both shoulders, mustard cardigan, teal top
  '...koyyttyyok...',
  '...osyyttyyso...',
  '....oyyyyyyo....',
  '....oBBBBBBo....',
];
const MADHU_FRONT_BLINK: Record<string, string> = {
  '..oksowssowsko..': '..okssssssssko..',
  '..oksoossoosko..': '..oksSSssSSsko..',
};

const MADHU_BACK_TOP: PixelMap = [
  '................',
  '................',
  '.....oooooo.....',
  '....okkkkkko....',
  '...okkKKkkkko...',
  '..okkKkkkkkkko..',
  '..okkkkkKkkkko..',
  '..okkkkkkkkkko..',
  '..okkKkkkkkkko..',
  '..okkkkkkkkkko..',
  '..okkkkkkkkkko..',
  '..okkkkkKkkkko..',
  '...okkkkkkkko...',
  '....oskkkkso....',
  '...oyyykkyyyo...', // braid down the back
  '...oyyykkyyyo...',
  '...osyyykyyso...',
  '....oyyyyyyo....',
  '....oBBBBBBo....',
];

const MADHU_SIDE_TOP: PixelMap = [
  '................',
  '................',
  '.....oooooo.....',
  '....okkkkkko....',
  '...okkKKkkkko...',
  '..okkKkkkkkkko..',
  '..okkkkkkkkkko..',
  '..okkkkkksssso..',
  '..okkkkkssssso..',
  '..okkkkksowsso..',
  '..okkkkksoosso..',
  '..okkkkkssxsso..',
  '..kkkkkksSsso...',
  '..kkk.ossso.....',
  '...kkoyyyyto....',
  '....koyyyyto....',
  '....oyyysyyo....',
  '....oyyyyyyo....',
  '.....oBBBBo.....',
];
const MADHU_SIDE_BLINK: Record<string, string> = {
  '..okkkkksowsso..': '..okkkkkssssso..',
  '..okkkkksoosso..': '..okkkkksSSsso..',
};

const LEGS_FRONT = {
  stand: ['....oBBooBBo....', '....oBBooBBo....', '....oDDooDDo....', '...oDDDooDDDo...'],
  stepL: ['....oBBooBBo....', '....oDDooBBo....', '...oDDDooDDo....', '........oDDDo...'],
  stepR: ['....oBBooBBo....', '....oBBooDDo....', '....oDDooDDDo...', '...oDDDo........'],
};
const LEGS_SIDE = {
  stand: ['.....oBBBBo.....', '.....oBBBBo.....', '.....oDDDDo.....', '.....oDDDDDo....'],
  stride: ['....oBBooBBo....', '...oBBo..oBBo...', '..oDDo....oDDo..', '..oDDo....oDDDo.'],
};

function compose(top: PixelMap, legs: PixelMap): PixelMap {
  return [...top, ...legs, '................'];
}

function blink(map: PixelMap, swaps: Record<string, string>): PixelMap {
  return map.map((row) => swaps[row] ?? row);
}

function mirror(map: PixelMap): PixelMap {
  return Grid.from(map).mirror().rows();
}

/** Bobs the body down by a pixel on contact frames, for a gentle walk. */
function bob(map: PixelMap): PixelMap {
  const topLen = MADHU_FRONT_TOP.length;
  return ['................', ...map.slice(0, topLen - 1), ...map.slice(topLen)];
}

export function madhuFrames(): Record<string, PixelMap[]> {
  const front = compose(MADHU_FRONT_TOP, LEGS_FRONT.stand);
  const back = compose(MADHU_BACK_TOP, LEGS_FRONT.stand);
  const side = compose(MADHU_SIDE_TOP, LEGS_SIDE.stand);
  const sideStride = compose(MADHU_SIDE_TOP, LEGS_SIDE.stride);
  const sideBlink = blink(side, MADHU_SIDE_BLINK);

  const walkDown = [
    front,
    bob(compose(MADHU_FRONT_TOP, LEGS_FRONT.stepL)),
    front,
    bob(compose(MADHU_FRONT_TOP, LEGS_FRONT.stepR)),
  ];
  const walkUp = [
    back,
    bob(compose(MADHU_BACK_TOP, LEGS_FRONT.stepR)),
    back,
    bob(compose(MADHU_BACK_TOP, LEGS_FRONT.stepL)),
  ];
  const walkRight = [side, bob(sideStride), side, bob(sideStride)];

  return {
    char_madhu_idle_down: [front, blink(front, MADHU_FRONT_BLINK)],
    char_madhu_idle_up: [back, back],
    char_madhu_idle_right: [side, sideBlink],
    char_madhu_idle_left: [mirror(side), mirror(sideBlink)],
    char_madhu_walk_down: walkDown,
    char_madhu_walk_up: walkUp,
    char_madhu_walk_right: walkRight,
    char_madhu_walk_left: walkRight.map(mirror),
  };
}

/* ---------- villagers (walk-in customers) ---------- */

export interface VillagerColors {
  skin: string;
  shade: string;
  hair: string;
  hairHi: string;
  shirt: string;
  accent: string;
  pants: string;
  shortHair: boolean;
}

/** Turns Madhu's long braid into a short cut, for variety. */
function shortHairFront(top: PixelMap): PixelMap {
  return top.map((row, i) => (i >= 12 && i <= 15 ? row.replace(/k/g, '.') : row));
}
function shortHairBack(top: PixelMap): PixelMap {
  return top.map((row, i) => (i === 13 ? row.replace(/k/g, 's') : i >= 14 && i <= 16 ? row.replace(/k/g, 'y') : row));
}

/**
 * Villagers reuse Madhu's chibi body with their own colors and hair, so every
 * character in the village shares one style. Walking down (toward the door) and up.
 */
export function villagerFrames(id: string, c: VillagerColors): Record<string, PixelMap[]> {
  const front = c.shortHair ? shortHairFront(MADHU_FRONT_TOP) : MADHU_FRONT_TOP;
  const back = c.shortHair ? shortHairBack(MADHU_BACK_TOP) : MADHU_BACK_TOP;
  const swap = { k: c.hair, K: c.hairHi, s: c.skin, S: c.shade, y: c.shirt, t: c.accent, B: c.pants };
  const tone = (m: PixelMap) => recolor(m, swap);
  const down = [
    compose(front, LEGS_FRONT.stand),
    bob(compose(front, LEGS_FRONT.stepL)),
    compose(front, LEGS_FRONT.stand),
    bob(compose(front, LEGS_FRONT.stepR)),
  ].map(tone);
  const up = [
    compose(back, LEGS_FRONT.stand),
    bob(compose(back, LEGS_FRONT.stepR)),
    compose(back, LEGS_FRONT.stand),
    bob(compose(back, LEGS_FRONT.stepL)),
  ].map(tone);
  return { [`char_${id}_walk_down`]: down, [`char_${id}_walk_up`]: up };
}
