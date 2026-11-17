/**
 * Fiber animal breeds. Values are inspired by real breed standards and
 * simplified for play; Madhu is welcome to correct any that feel off.
 * New breeds need only a new entry here (plus sprites in the asset manifest).
 */

export interface NaturalColor {
  id: string;
  name: string;
  /** Fleece color and its shade, used for sprites and yarn. */
  hex: string;
  shade: string;
}

export interface Breed {
  id: string;
  name: string;
  /** Average fiber diameter in microns (lower is softer). */
  micron: number;
  /** Staple length at full growth, cm. */
  fullStapleCm: number;
  /** Raw (greasy) fleece weight at full growth, grams. */
  rawFleeceG: number;
  /** Fraction of raw weight left after scouring (grease, suint and dirt washed out). */
  scouredYield: number;
  /** Real-time hours from shorn to full fleece. */
  fullGrowthHours: number;
  crimp: 'low' | 'medium' | 'high' | 'very high';
  luster: 'low' | 'medium' | 'high';
  grease: 'light' | 'medium' | 'heavy';
  /** Baseline vegetable-matter penalty (0-10) before pasture and feeder upgrades. */
  baseVm: number;
  naturalColors: NaturalColor[];
  bestFor: string;
  /** Short entry for the breed book. */
  blurb: string;
  /** Sprite key prefix, e.g. `sheep_merino` → `sheep_merino_stage0..3`. */
  sprite: string;
  /** Purchase price in the shop ($); null for the starting animal only. */
  price: number | null;
  /** Shop price for 100 g of handspun yarn, before multipliers ($). */
  basePer100g: number;
}

const WHITE: NaturalColor = { id: 'white', name: 'White', hex: '#FFF8EC', shade: '#E6DCCB' };

export const BREEDS: Breed[] = [
  {
    id: 'merino',
    name: 'Merino',
    micron: 19,
    fullStapleCm: 7,
    rawFleeceG: 400,
    scouredYield: 0.5,
    fullGrowthHours: 4,
    crimp: 'very high',
    luster: 'low',
    grease: 'heavy',
    baseVm: 4,
    naturalColors: [WHITE],
    bestFor: 'Next-to-skin, woolen spun, takes pastels beautifully',
    blurb:
      'Fine, dense and crimpy, with a lot of lanolin, so expect to lose about half the raw weight in the scour. ' +
      'Short staples card beautifully into airy rolags.',
    sprite: 'sheep_merino',
    price: 120,
    basePer100g: 22,
  },
  {
    id: 'shetland',
    name: 'Shetland',
    micron: 23,
    fullStapleCm: 9,
    rawFleeceG: 350,
    scouredYield: 0.7,
    fullGrowthHours: 4,
    crimp: 'high',
    luster: 'medium',
    grease: 'light',
    baseVm: 4,
    naturalColors: [
      WHITE,
      { id: 'moorit', name: 'Moorit', hex: '#8A5A35', shade: '#6E4428' },
      { id: 'shaela', name: 'Shaela', hex: '#8E8790', shade: '#6F6870' },
      { id: 'musket', name: 'Musket', hex: '#A8957F', shade: '#8C7A66' },
      { id: 'emsket', name: 'Emsket', hex: '#9C9AAE', shade: '#7F7D93' },
      { id: 'black', name: 'Black', hex: '#3A3030', shade: '#2B2424' },
    ],
    bestFor: 'Fair Isle colorwork, natural undyed yarn',
    blurb: 'A hardy little island breed with soft, light fleece in a whole family of named natural shades.',
    sprite: 'sheep_shetland',
    price: 180,
    basePer100g: 20,
  },
  {
    id: 'bfl',
    name: 'Bluefaced Leicester',
    micron: 26,
    fullStapleCm: 12,
    rawFleeceG: 400,
    scouredYield: 0.75,
    fullGrowthHours: 5,
    crimp: 'medium',
    luster: 'high',
    grease: 'light',
    baseVm: 4,
    naturalColors: [WHITE],
    bestFor: 'Lustrous worsted yarn, saturated dye, socks',
    blurb: 'A longwool with purled locks and lovely luster. Combs into silky top and takes dye with real brilliance.',
    sprite: 'sheep_bfl',
    price: 250,
    basePer100g: 24,
  },
];

export function breed(id: string): Breed {
  const b = BREEDS.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown breed "${id}"`);
  return b;
}

export function naturalColor(b: Breed, id: string): NaturalColor {
  return b.naturalColors.find((c) => c.id === id) ?? b.naturalColors[0];
}
