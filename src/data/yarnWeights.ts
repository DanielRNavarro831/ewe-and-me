/**
 * Standard yarn weights by wraps per inch (WPI), with approximate yardage per
 * 100 g and the shop price multiplier from the design doc.
 */

export interface YarnWeight {
  id: string;
  name: string;
  /** Lowest WPI that still counts as this weight. */
  minWpi: number;
  yardsPer100g: number;
  priceMultiplier: number;
}

/** Heaviest first; the first entry whose minWpi ≤ WPI wins when scanning from the finest. */
export const YARN_WEIGHTS: YarnWeight[] = [
  { id: 'lace', name: 'Lace', minWpi: 18, yardsPer100g: 800, priceMultiplier: 1.4 },
  { id: 'fingering', name: 'Fingering', minWpi: 14, yardsPer100g: 400, priceMultiplier: 1.25 },
  { id: 'sport', name: 'Sport', minWpi: 12.5, yardsPer100g: 325, priceMultiplier: 1.15 },
  { id: 'dk', name: 'DK', minWpi: 10.5, yardsPer100g: 250, priceMultiplier: 1.1 },
  { id: 'worsted', name: 'Worsted', minWpi: 8.5, yardsPer100g: 200, priceMultiplier: 1.0 },
  { id: 'aran', name: 'Aran', minWpi: 7.5, yardsPer100g: 170, priceMultiplier: 0.95 },
  { id: 'bulky', name: 'Bulky', minWpi: 5.5, yardsPer100g: 120, priceMultiplier: 0.9 },
  { id: 'superbulky', name: 'Super bulky', minWpi: 0, yardsPer100g: 80, priceMultiplier: 0.85 },
];

export function weightForWpi(wpi: number): YarnWeight {
  return YARN_WEIGHTS.find((w) => wpi >= w.minWpi) ?? YARN_WEIGHTS[YARN_WEIGHTS.length - 1];
}

/**
 * Spinning wheel whorl ratios. A higher ratio puts more twist in per treadle,
 * suiting finer yarn. `targetWpi` is the singles grist each ratio is set up for.
 */
export interface WhorlRatio {
  id: 'high' | 'medium' | 'low';
  label: string;
  ratio: number;
  targetWpi: number;
  /** Target thickness on the drafting track, 0 (fine) to 1 (bulky). */
  targetThickness: number;
}

export const WHORLS: WhorlRatio[] = [
  { id: 'high', label: 'High (12:1), for fine yarn', ratio: 12, targetWpi: 20, targetThickness: 0.28 },
  { id: 'medium', label: 'Medium (8:1)', ratio: 8, targetWpi: 15, targetThickness: 0.5 },
  { id: 'low', label: 'Low (5:1), for bulky yarn', ratio: 5, targetWpi: 10, targetThickness: 0.72 },
];

export function whorl(id: WhorlRatio['id']): WhorlRatio {
  return WHORLS.find((w) => w.id === id)!;
}
