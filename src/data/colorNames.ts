/**
 * Words for suggesting colorway names. Madhu always names her colorways
 * herself; these are just a friendly starting point.
 */

/** Hue ranges (degrees) with nouns that suit them. */
export const HUE_NOUNS: { upTo: number; nouns: string[] }[] = [
  { upTo: 12, nouns: ['Rosehip', 'Poppy', 'Cranberry', 'Ruby'] },
  { upTo: 35, nouns: ['Coral', 'Persimmon', 'Paprika', 'Terracotta'] },
  { upTo: 50, nouns: ['Apricot', 'Marmalade', 'Pumpkin', 'Saffron'] },
  { upTo: 65, nouns: ['Marigold', 'Honey', 'Buttercup', 'Mustard'] },
  { upTo: 90, nouns: ['Pear', 'Chartreuse', 'Lime Zest', 'Pistachio'] },
  { upTo: 150, nouns: ['Meadow', 'Moss', 'Fern', 'Clover'] },
  { upTo: 185, nouns: ['Sea Glass', 'Jade', 'Mint', 'Eucalyptus'] },
  { upTo: 210, nouns: ['Lagoon', 'Teal', 'Peacock', 'Tidepool'] },
  { upTo: 235, nouns: ['Sky', 'Cornflower', 'Bluebell', 'Harbor'] },
  { upTo: 265, nouns: ['Indigo', 'Twilight', 'Ink', 'Denim'] },
  { upTo: 295, nouns: ['Iris', 'Lavender', 'Violet', 'Heather'] },
  { upTo: 330, nouns: ['Plum', 'Orchid', 'Fuchsia', 'Mulberry'] },
  { upTo: 361, nouns: ['Peony', 'Raspberry', 'Rose', 'Camellia'] },
];

/** Prefixes by lightness and saturation. */
export const PASTEL_WORDS = ['Whisper of', 'Soft', 'Morning', 'Petal', 'Sugared'];
export const DEEP_WORDS = ['Deep', 'Midnight', 'Velvet', 'Stormy', 'Old'];
export const MUTED_WORDS = ['Dusty', 'Faded', 'Misty', 'Weathered', 'Smoky'];
export const BRIGHT_WORDS = ['Bright', 'Festival', 'Wild', 'Sunlit', 'Jewel'];
export const NEUTRAL_NAMES = ['Oatmeal', 'Driftwood', 'Pebble', 'Stone', 'Fog', 'Charcoal'];
