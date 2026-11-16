import { Grid, type PixelMap } from './grid';

/**
 * Madhu, 16x24. Front, back and side views share leg rows (18-22),
 * which are swapped to make walk frames.
 */
const MADHU_FRONT_TOP: PixelMap = [
  '................',
  '......oooo......',
  '.....okkkko.....',
  '....okkKKkko....',
  '....okkkkkko....',
  '....okssssko....',
  '....okossoko....', // eyes
  '....oksSSsko....',
  '....kossssok....',
  '....kkoSSokk....',
  '...okyyttyyko...',
  '..oyyyyttyyyyo..',
  '..oyykyttyyyyo..',
  '..oyyyyttyyyyo..',
  '.osyyyyttyyyyso.',
  '..oyyyBBBByyyo..',
  '...oyBBBBBByo...',
  '....oBBBBBBo....',
];
const MADHU_FRONT_BLINK_ROW = '....okSssSko....';

const MADHU_BACK_TOP: PixelMap = [
  '................',
  '......oooo......',
  '.....okkkko.....',
  '....okkKKkko....',
  '....okkkkkko....',
  '....okkKkkko....',
  '....okkkkkko....',
  '....okkkkkko....',
  '.....okkkko.....',
  '.....oSkkSo.....',
  '...oyyykkyyyo...',
  '..oyyyykkyyyyo..',
  '..oyyyykkyyyyo..',
  '..oyyyyykyyyyo..',
  '.osyyyyyyyyyyso.',
  '..oyyyyyyyyyyo..',
  '...oyBBBBBByo...',
  '....oBBBBBBo....',
];

const MADHU_SIDE_TOP: PixelMap = [
  '................',
  '......oooo......',
  '.....okkkko.....',
  '....okkKKkko....',
  '....okkkkkko....',
  '....okkkssssso..',
  '....okkksossso..',
  '....okkkssssso..',
  '....okkksSsso...',
  '....kokkSSo.....',
  '....kokyyyyto...',
  '....kokyyyyto...',
  '....okyyyyyyo...',
  '....oyyysyyyo...',
  '....oyyysyyyo...',
  '....oyyyyyyyo...',
  '.....oBBBBBo....',
  '.....oBBBBBo....',
];
const MADHU_SIDE_BLINK_ROW = '....okkksSssso..';

const LEGS_FRONT = {
  stand: ['....oBBooBBo....', '....oBBooBBo....', '....oBBooBBo....', '....oDDooDDo....', '...oDDDooDDDo...'],
  stepL: ['....oBBooBBo....', '....oBBooBBo....', '....oDDooBBo....', '...oDDDooDDo....', '........oDDDo...'],
  stepR: ['....oBBooBBo....', '....oBBooBBo....', '....oBBooDDo....', '....oDDooDDDo...', '...oDDDo........'],
};
const LEGS_SIDE = {
  stand: ['.....oBBBBo.....', '.....oBBBBo.....', '.....oBBBBo.....', '.....oDDDDo.....', '.....oDDDDDo....'],
  stride: ['....oBBBBBo.....', '...oBBooBBBo....', '...oBo...oBBo...', '..oDDo....oDDo..', '..oDDo....oDDDo.'],
};

function compose(top: PixelMap, legs: PixelMap): PixelMap {
  return [...top, ...legs, '................'];
}

function withRow(map: PixelMap, index: number, row: string): PixelMap {
  const copy = [...map];
  copy[index] = row;
  return copy;
}

function mirror(map: PixelMap): PixelMap {
  return Grid.from(map).mirror().rows();
}

/** Bobs the body down by a pixel on contact frames, for a gentle walk. */
function bob(map: PixelMap): PixelMap {
  const top = map.slice(0, 18);
  const legs = map.slice(18);
  return [...['................'], ...top.slice(0, 17), ...legs];
}

export function madhuFrames(): Record<string, PixelMap[]> {
  const front = compose(MADHU_FRONT_TOP, LEGS_FRONT.stand);
  const back = compose(MADHU_BACK_TOP, LEGS_FRONT.stand);
  const side = compose(MADHU_SIDE_TOP, LEGS_SIDE.stand);
  const sideStride = compose(MADHU_SIDE_TOP, LEGS_SIDE.stride);

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
    char_madhu_idle_down: [front, withRow(front, 6, MADHU_FRONT_BLINK_ROW)],
    char_madhu_idle_up: [back, back],
    char_madhu_idle_right: [side, withRow(side, 6, MADHU_SIDE_BLINK_ROW)],
    char_madhu_idle_left: [mirror(side), mirror(withRow(side, 6, MADHU_SIDE_BLINK_ROW))],
    char_madhu_walk_down: walkDown,
    char_madhu_walk_up: walkUp,
    char_madhu_walk_right: walkRight,
    char_madhu_walk_left: walkRight.map(mirror),
  };
}
