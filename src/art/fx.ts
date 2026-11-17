import type { PixelMap } from './grid';

/** Small 8x8 effect sprites: hearts for petting, sparkles for brushing, snips for second cuts. */

export const FX_HEART: PixelMap = [
  '........',
  '.oo.oo..',
  'oxxoxxo.',
  'oxwxxxo.',
  'oxxxxxo.',
  '.oxxxo..',
  '..oxo...',
  '...o....',
];

export const FX_SPARKLE: PixelMap = [
  '........',
  '...o....',
  '..owo...',
  'oowfwoo.',
  '..owo...',
  '...o....',
  '........',
  '........',
];

/** A tuft of short second-cut fibers. */
export const FX_SNIP: PixelMap = [
  '........',
  '..o..o..',
  '.ofooFo.',
  '.offfFo.',
  '..oFFo..',
  '...oo...',
  '........',
  '........',
];
