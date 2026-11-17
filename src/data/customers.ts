/**
 * Walk-in customers: anonymous villagers who browse the shelves. (The named
 * neighbors, with friendships and commissions, arrive in M5.)
 */

export type PrefKind = 'fiber' | 'weight' | 'color' | 'technique';

export interface Pref {
  kind: PrefKind;
  value: string;
  label: string;
}

/** Technique preferences a customer can have, matched against yarn tags and dye. */
export const TECHNIQUE_PREFS: Pref[] = [
  { kind: 'technique', value: 'undyed', label: 'Undyed' },
  { kind: 'technique', value: 'dyed', label: 'Hand-dyed' },
  { kind: 'technique', value: 'art', label: 'Art yarn' },
  { kind: 'technique', value: 'balanced', label: 'Balanced ply' },
  { kind: 'technique', value: 'woolen', label: 'Woolen spun' },
];

export const COLOR_PREFS: Pref[] = [
  { kind: 'color', value: 'white', label: 'White' },
  { kind: 'color', value: 'natural', label: 'Natural color' },
  { kind: 'color', value: 'pastel', label: 'Pastel' },
  { kind: 'color', value: 'warm', label: 'Warm colors' },
  { kind: 'color', value: 'cool', label: 'Cool colors' },
  { kind: 'color', value: 'bright', label: 'Bright' },
];

/** What customers say. {item} is replaced with the yarn's name. */
export const LINES = {
  perfect: [
    'Oh, this is exactly what I was hoping for!',
    'Perfect! I know just what I’ll knit.',
    'I could squish this all day. I’ll take it!',
    'Look at that stitch definition. Sold!',
  ],
  okay: ['This will do nicely.', 'Not quite what I came for, but it’s lovely.', 'I’ll take this one, thank you!'],
  pricey: ['Lovely, but a little dear for me today.', 'Hmm, maybe next payday.'],
  nothing: ['Nothing for me today, but I’ll be back!', 'I’ll check again next week.', 'Such a cozy shop!'],
  empty: ['Oh! The shelves are empty. I’ll come back soon.'],
};

/**
 * Villager looks, as palette keys for the template sprite.
 * skin/shade, hair, shirt, accent (scarf/top), pants, and short or long hair.
 */
export interface VillagerLook {
  id: string;
  skin: string;
  shade: string;
  hair: string;
  hairHi: string;
  shirt: string;
  accent: string;
  pants: string;
  shortHair: boolean;
}

export const VILLAGERS: VillagerLook[] = [
  { id: 'v1', skin: 'p', shade: 'P', hair: 'r', hairHi: 'R', shirt: 'x', accent: 'w', pants: 'B', shortHair: true },
  { id: 'v2', skin: 'W', shade: 'D', hair: 'k', hairHi: 'K', shirt: 'v', accent: 'y', pants: 'n', shortHair: false },
  { id: 'v3', skin: 'p', shade: 'P', hair: 'g', hairHi: 'l', shirt: 't', accent: 'l', pants: 'm', shortHair: true },
  { id: 'v4', skin: 's', shade: 'S', hair: 'k', hairHi: 'K', shirt: 'h', accent: 'H', pants: 'B', shortHair: true },
  { id: 'v5', skin: 'p', shade: 'P', hair: 'c', hairHi: 'C', shirt: 'B', accent: 'b', pants: 'n', shortHair: false },
  { id: 'v6', skin: 'L', shade: 'W', hair: 'y', hairHi: 'w', shirt: 'G', accent: 'x', pants: 'D', shortHair: false },
];
