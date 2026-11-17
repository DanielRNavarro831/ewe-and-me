/**
 * Skein pricing (design doc):
 *   price = base(100 g) × grams/100 × m_weight × m_quality × m_dye × m_demand
 * Art yarn uses a flat 1.3 weight multiplier; a balanced ply adds 5%.
 * Madhu can nudge any shelf price by up to ±30%.
 * Base prices per 100 g live on each breed (data/breeds.ts); weight
 * multipliers on each yarn weight (data/yarnWeights.ts).
 */
import type { Grade } from '../systems/state';
import type { Season } from '../systems/clock';

export const QUALITY_MULT: Record<Grade, number> = {
  Common: 1.0,
  Fine: 1.25,
  Superior: 1.6,
  Masterwork: 2.2,
};

/** Keys: 'white' and 'natural' for undyed yarn, otherwise the dye technique id. */
export const DYE_MULT: Record<string, number> = {
  white: 1.0,
  natural: 1.1,
  immersion: 1.2,
  kettle: 1.3,
  speckle: 1.4,
  handpainted: 1.5,
  gradient: 1.6,
};

export const ART_YARN_WEIGHT_MULT = 1.3;
export const BALANCED_PLY_BONUS = 1.05;
export const MAX_NUDGE = 0.3;

export type ColorFamily = 'white' | 'natural' | 'pastel' | 'warm' | 'cool' | 'deep' | 'bright';

/**
 * Seasonal demand: winter boosts worsted and bulky; spring boosts lighter
 * weights and pastels; autumn boosts warm colors; summer boosts fingering and
 * lace (and plant fibers, once added). Rules multiply; the result is kept
 * within 0.8–1.5 together with the weekly trend.
 */
export interface DemandRule {
  weights?: string[];
  colors?: ColorFamily[];
  mult: number;
  why: string;
}

export const SEASONAL_DEMAND: Record<Season, DemandRule[]> = {
  winter: [
    { weights: ['worsted', 'aran', 'bulky', 'superbulky'], mult: 1.3, why: 'cozy winter knitting' },
    { weights: ['lace'], mult: 0.9, why: 'lace waits for spring' },
  ],
  spring: [
    { weights: ['lace', 'fingering', 'sport', 'dk'], mult: 1.15, why: 'lighter spring knits' },
    { colors: ['pastel'], mult: 1.3, why: 'pastels in spring' },
  ],
  summer: [
    { weights: ['fingering', 'lace'], mult: 1.3, why: 'summer shawls and socks' },
    { weights: ['bulky', 'superbulky'], mult: 0.85, why: 'too warm for bulky' },
  ],
  autumn: [{ colors: ['warm'], mult: 1.3, why: 'autumn colors' }],
};

export const DEMAND_MIN = 0.8;
export const DEMAND_MAX = 1.5;
