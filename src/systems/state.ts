/**
 * The whole game lives in one versioned JSON object.
 *
 * To change the save format:
 *   1. bump SAVE_VERSION,
 *   2. add a migration from the previous version in MIGRATIONS,
 *   3. update GameState and newGame().
 * Old saves are then upgraded step by step on load, so nothing is ever lost.
 */

export const SAVE_VERSION = 5;

export type SceneKey = 'Ranch' | 'Workshop' | 'DyeStudio' | 'Shop' | 'Stash' | 'Collection';

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  hemisphere: 'north' | 'south';
  /** 0 = Sunday ... 6 = Saturday */
  knittingCircleDay: number;
  /** Debug fast-forward, added to the real clock. */
  debugTimeOffsetMs: number;
}

export interface Animal {
  id: string;
  breedId: string;
  colorId: string;
  /** Chosen by Madhu; null until she names it. */
  name: string | null;
  /** Fleece growth since the last shearing, 0..1 (1 = full fleece). */
  growth: number;
  /** Part of `growth` that grew while hay was in the trough. */
  fedGrowth: number;
  /** Part of `growth` that grew while premium grain was in the trough. */
  grainGrowth: number;
  /** 0..100; drifts down toward 50 but never below it. */
  happiness: number;
  /** Time growth and happiness were last brought up to date. */
  updatedAt: number;
  /** Local date (YYYY-MM-DD) of the last pet and brush, for once-a-day care. */
  lastPetDay: string | null;
  lastBrushDay: string | null;
  timesShorn: number;
  arrivedAt: number;
}

export type Grade = 'Common' | 'Fine' | 'Superior' | 'Masterwork';

export type FiberKind = 'fleece' | 'skirted' | 'clean' | 'felt' | 'rolags' | 'top' | 'singles' | 'plied';
export type Prep = 'woolen' | 'worsted' | 'semi-worsted';

/**
 * Any fiber on its way to becoming yarn: a raw fleece, a skirted fleece, clean
 * (scoured) wool, a felt batt, rolags, bobbins of singles or plied yarn.
 * Each processing step replaces the item with the next kind.
 */
export interface FiberItem {
  id: string;
  kind: FiberKind;
  breedId: string;
  colorId: string;
  /** Name of the animal it came from. */
  from: string;
  grams: number;
  stapleCm: number;
  /** Fiber quality so far, 0..100 (fleece score, plus skirting, minus scouring trouble…). */
  score: number;
  createdAt: number;
  tags: string[];
  /** Set at shearing. */
  rawGrams?: number;
  secondCuts?: number;
  parts?: { happiness: number; feed: number; growth: number; vm: number; secondCuts: number };
  /** Set at skirting (0..20). */
  skirtBonus?: number;
  /** Set when spun. */
  prep?: Prep;
  wpi?: number;
  evenness?: number;
  twist?: 'under' | 'balanced' | 'over';
  /** Set when plied. */
  plies?: number;
  chainPlied?: boolean;
  plyBalance?: number;
}

/** A finished, labeled skein. */
export interface Yarn {
  id: string;
  breedId: string;
  colorId: string;
  from: string;
  prep: Prep;
  plies: number;
  chainPlied: boolean;
  wpi: number;
  weightId: string;
  grams: number;
  yards: number;
  evenness: number;
  /** 0..100, or null for singles. */
  plyBalance: number | null;
  balanced: boolean;
  score: number;
  grade: Grade;
  tags: string[];
  madeAt: number;
  /** Filled in by the Dye Studio. */
  dye: null | YarnDye;
  /** While hanging on the drying rack after dyeing: when it's dry. */
  dryingUntil?: number;
}

export interface YarnDye {
  /** Colorway name (from the swatch book). */
  colorway: string;
  colorwayId: string;
  /** Dye lot number, e.g. "014". */
  lot: string;
  technique: string;
  /** Main color; kettle-dyed skeins also have lighter and darker tones. */
  hex: string;
  tones?: [string, string];
}

/** A saved recipe in the swatch book. Amounts are DOS % so they scale to any pot. */
export interface Colorway {
  id: string;
  name: string;
  dos: { red: number; yellow: number; blue: number; black: number };
  technique: string;
  /** Color on white wool with full uptake, for the swatch. */
  hex: string;
  createdAt: number;
  lots: string[];
}

export interface Sale {
  yarnId: string;
  name: string;
  price: number;
  tip: number;
  /** 'customer' while Madhu's in, 'daniel' for his away-sales. */
  by: 'customer' | 'daniel';
  at: number;
}

export interface ShopState {
  /** Number of shelf slots (6 to start). */
  slots: number;
  /** Yarn id on each slot, or null. */
  shelf: (string | null)[];
  /** Price nudge per yarn id, −0.3..+0.3. */
  nudges: Record<string, number>;
  /** Fractional away-sales Daniel has "earned" but not used yet. */
  awayCredit: number;
  /** Recent sales, newest last (kept to 60). */
  sales: Sale[];
}

export interface GameState {
  version: number;
  createdAt: number;
  /** Last time the game was running (used to compute time away on resume). */
  lastSeenAt: number;
  /** Last real-time daily refresh that has been applied (6 a.m. commissions etc.). */
  lastDailyRefreshAt: number;
  shopName: string | null;
  money: number;
  reputation: number;
  currentScene: SceneKey;
  /** Madhu's position in each room, so she is where she was left. */
  positions: Partial<Record<SceneKey, { x: number; y: number }>>;
  animals: Animal[];
  /** Until when each feed is in the trough (timestamps; 0 = empty). */
  feed: { hayUntil: number; alfalfaUntil: number; grainUntil: number };
  /** Fiber in progress, from raw fleece to bobbins. */
  fiber: FiberItem[];
  /** Finished skeins. */
  yarns: Yarn[];
  /** Achievement ids earned. */
  achievements: string[];
  shop: ShopState;
  /** The swatch book. */
  colorways: Colorway[];
  /** Next dye lot number. */
  nextLot: number;
  /** Upgrade ids bought (M6 fills in the catalog). */
  upgrades: string[];
  nextId: number;
  settings: Settings;
  stats: {
    launches: number;
    saves: number;
    shorn: number;
    pets: number;
    skeins: number;
    frogged: number;
    sold: number;
    earned: number;
    dyeBatches: number;
  };
}

export function newShop(): ShopState {
  return { slots: 6, shelf: [null, null, null, null, null, null], nudges: {}, awayCredit: 0, sales: [] };
}

export function starterSheep(now: number, id = 'a1'): Animal {
  return {
    id,
    breedId: 'merino',
    colorId: 'white',
    name: null,
    growth: 1,
    fedGrowth: 0,
    grainGrowth: 0,
    happiness: 60,
    updatedAt: now,
    lastPetDay: null,
    lastBrushDay: null,
    timesShorn: 0,
    arrivedAt: now,
  };
}

export function newGame(now: number): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeenAt: now,
    lastDailyRefreshAt: now,
    shopName: null,
    money: 50,
    reputation: 0,
    currentScene: 'Ranch',
    positions: {},
    animals: [starterSheep(now)],
    feed: { hayUntil: 0, alfalfaUntil: 0, grainUntil: 0 },
    fiber: [],
    yarns: [],
    achievements: [],
    shop: newShop(),
    colorways: [],
    nextLot: 1,
    upgrades: [],
    nextId: 2,
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      hemisphere: 'north',
      knittingCircleDay: 6,
      debugTimeOffsetMs: 0,
    },
    stats: { launches: 0, saves: 0, shorn: 0, pets: 0, skeins: 0, frogged: 0, sold: 0, earned: 0, dyeBatches: 0 },
  };
}

type Migration = (old: any) => any;

/** MIGRATIONS[n] upgrades a version-n save to version n+1. */
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2 (M1 Ranch): the first Merino arrives, plus feed and fleece storage.
  1: (s) => ({
    ...s,
    version: 2,
    animals: [starterSheep(Date.now())],
    feed: { hayUntil: 0, alfalfaUntil: 0, grainUntil: 0 },
    fleeces: [],
    nextId: 2,
    stats: { ...s.stats, shorn: 0, pets: 0 },
  }),
  // v2 → v3 (M2 Workshop): raw fleeces join a general fiber list; skeins and achievements arrive.
  2: (s) => {
    const { fleeces = [], ...rest } = s;
    const achievements = (rest.stats?.shorn ?? 0) > 0 ? ['first_fleece'] : [];
    return {
      ...rest,
      version: 3,
      fiber: fleeces.map((f: any) => ({
        id: f.id,
        kind: 'fleece',
        breedId: f.breedId,
        colorId: f.colorId,
        from: f.from,
        grams: f.rawGrams,
        rawGrams: f.rawGrams,
        stapleCm: f.stapleCm,
        score: f.score,
        createdAt: f.shornAt,
        tags: [],
        secondCuts: f.secondCuts,
        parts: f.parts,
      })),
      yarns: [],
      achievements,
      stats: { ...rest.stats, skeins: 0, frogged: 0 },
    };
  },
  // v3 → v4 (M3 Shop): shelves, price nudges and the sales ledger.
  3: (s) => ({ ...s, version: 4, shop: newShop(), stats: { ...s.stats, sold: 0, earned: 0 } }),
  // v4 → v5 (M4 Dye Studio): the swatch book, dye lots and upgrades.
  4: (s) => ({ ...s, version: 5, colorways: [], nextLot: 1, upgrades: [], stats: { ...s.stats, dyeBatches: 0 } }),
};

export class SaveTooNewError extends Error {}

/**
 * Upgrades any older save to the current version, and fills in any missing
 * fields with defaults so a partially written save still loads.
 */
export function migrate(raw: any): GameState {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') {
    throw new Error('Not a game save');
  }
  if (raw.version > SAVE_VERSION) {
    throw new SaveTooNewError(`This save is from a newer version of the game (v${raw.version}).`);
  }
  let s = raw;
  while (s.version < SAVE_VERSION) {
    const step = MIGRATIONS[s.version];
    if (!step) throw new Error(`No migration from save v${s.version}`);
    s = step(s);
  }
  const base = newGame(typeof s.createdAt === 'number' ? s.createdAt : Date.now());
  return {
    ...base,
    ...s,
    settings: { ...base.settings, ...(s.settings ?? {}) },
    stats: { ...base.stats, ...(s.stats ?? {}) },
    feed: { ...base.feed, ...(s.feed ?? {}) },
    positions: { ...(s.positions ?? {}) },
    animals: Array.isArray(s.animals) ? s.animals : base.animals,
    fiber: Array.isArray(s.fiber) ? s.fiber : [],
    yarns: Array.isArray(s.yarns) ? s.yarns : [],
    achievements: Array.isArray(s.achievements) ? s.achievements : [],
    shop: { ...newShop(), ...(s.shop ?? {}) },
    colorways: Array.isArray(s.colorways) ? s.colorways : [],
    upgrades: Array.isArray(s.upgrades) ? s.upgrades : [],
  };
}

/** A new unique id for animals, fleeces and later items. */
export function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}
