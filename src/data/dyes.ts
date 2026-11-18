/**
 * Acid dyes for protein fibers, measured from 1% stock solutions:
 * 1 ml of stock = 0.01 g of dye powder. Depth of shade (DOS) is grams of dye
 * per gram of fiber: about 0.25% is pale, 1% medium, 3–4% deep.
 */

export interface Dye {
  id: 'red' | 'yellow' | 'blue' | 'black';
  name: string;
  /** Jar color in the studio and the slider accent. */
  jar: string;
  /** Number of dye batches before it's available (black is an early unlock). */
  unlockAfterBatches: number;
}

export const DYES: Dye[] = [
  { id: 'red', name: 'Cool red', jar: '#C4245A', unlockAfterBatches: 0 },
  { id: 'yellow', name: 'Yellow', jar: '#F2C230', unlockAfterBatches: 0 },
  { id: 'blue', name: 'Blue', jar: '#2A5FB0', unlockAfterBatches: 0 },
  { id: 'black', name: 'Black', jar: '#2B2424', unlockAfterBatches: 1 },
];

export type DyeAmounts = Record<Dye['id'], number>;

/** The most stock the sliders allow, as DOS %. */
export const MAX_DOS_PER_DYE = 4;

export interface Acid {
  id: 'vinegar' | 'citric';
  name: string;
  /** How completely the bath can exhaust with plenty of this acid. */
  efficiency: number;
  /** Upgrade id needed, or null if available from the start. */
  upgrade: string | null;
}

export const ACIDS: Acid[] = [
  { id: 'vinegar', name: 'White vinegar', efficiency: 0.92, upgrade: null },
  { id: 'citric', name: 'Citric acid', efficiency: 0.98, upgrade: 'citric_acid' },
];

/** How much acid goes in. Too little leaves dye in the pot and a paler result. */
export const ACID_AMOUNTS = [
  { id: 'none', label: 'None', factor: 0.35 },
  { id: 'splash', label: 'A splash', factor: 0.75 },
  { id: 'plenty', label: 'A good glug', factor: 1 },
] as const;

/** Dyeing techniques (design doc). `shopLevel` is the level that unlocks it. */
export interface Technique {
  id: 'immersion' | 'kettle' | 'speckle' | 'handpainted' | 'gradient';
  name: string;
  howItPlays: string;
  look: string;
  shopLevel: number | null;
}

export const TECHNIQUES: Technique[] = [
  { id: 'immersion', name: 'Immersion', howItPlays: 'Full dye bath, stir gently', look: 'Solid, even', shopLevel: 1 },
  { id: 'kettle', name: 'Kettle', howItPlays: 'Low water, dye poured in spots', look: 'Tonal semi-solid', shopLevel: 2 },
  { id: 'speckle', name: 'Speckle', howItPlays: 'Sprinkle dry powder on damp yarn', look: 'Speckles of color', shopLevel: 3 },
  { id: 'handpainted', name: 'Hand-painted', howItPlays: 'Paint sections of a skein laid flat', look: 'Variegated', shopLevel: 4 },
  { id: 'gradient', name: 'Gradient', howItPlays: 'Dip a long blank in steps', look: 'Slow fade', shopLevel: null },
];

/** Target bath temperature: about 85°C (185°F). */
export const DYE_TEMP = { low: 80, high: 90, target: 85 };

/** Real-time drying on the rack, in minutes. */
export const DRYING_MINUTES = 15;

/** Skeins the pot holds before upgrades (6 and 10 later). */
export const POT_CAPACITY = 3;
