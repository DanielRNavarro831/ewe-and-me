/**
 * Feeds for the ranch troughs. Hay is always free; the others are bought later
 * (M6) and last a number of days. An empty trough simply means no bonus.
 */

export interface Feed {
  id: 'hay' | 'alfalfa' | 'grain';
  name: string;
  /** Price in dollars (0 = free). */
  price: number;
  /** How long one filling lasts, in hours. */
  lastsHours: number;
  /** Multiplier on fleece growth speed while fed. */
  growthMultiplier: number;
  /** Fleece quality points earned while fed for the whole growth period. */
  qualityPoints: number;
  description: string;
}

export const FEEDS: Feed[] = [
  {
    id: 'hay',
    name: 'Hay',
    price: 0,
    lastsHours: 24,
    growthMultiplier: 1,
    qualityPoints: 5,
    description: 'Good meadow hay, free and always on hand. Fill the trough once a day.',
  },
  {
    id: 'alfalfa',
    name: 'Alfalfa',
    price: 40,
    lastsHours: 24 * 10,
    growthMultiplier: 1.25,
    qualityPoints: 0,
    description: 'Rich in protein: fleece grows 25% faster for 10 days.',
  },
  {
    id: 'grain',
    name: 'Premium grain mix',
    price: 60,
    lastsHours: 24 * 10,
    growthMultiplier: 1,
    qualityPoints: 5,
    description: 'Adds up to 5 quality points to fleeces grown over the next 10 days.',
  },
];

export function feed(id: Feed['id']): Feed {
  return FEEDS.find((f) => f.id === id)!;
}
