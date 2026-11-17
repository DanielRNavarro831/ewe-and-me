/**
 * The whole game lives in one versioned JSON object.
 *
 * To change the save format:
 *   1. bump SAVE_VERSION,
 *   2. add a migration from the previous version in MIGRATIONS,
 *   3. update GameState and newGame().
 * Old saves are then upgraded step by step on load, so nothing is ever lost.
 */

export const SAVE_VERSION = 2;

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

/** A raw fleece straight off the sheep, before skirting and scouring. */
export interface Fleece {
  id: string;
  breedId: string;
  colorId: string;
  /** Name of the animal it came from. */
  from: string;
  rawGrams: number;
  stapleCm: number;
  /** Quality before skirting; skirting adds its bonus in M2. */
  score: number;
  grade: Grade;
  parts: { happiness: number; feed: number; growth: number; vm: number; secondCuts: number };
  secondCuts: number;
  shornAt: number;
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
  fleeces: Fleece[];
  nextId: number;
  settings: Settings;
  stats: {
    launches: number;
    saves: number;
    shorn: number;
    pets: number;
  };
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
    fleeces: [],
    nextId: 2,
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      hemisphere: 'north',
      knittingCircleDay: 6,
      debugTimeOffsetMs: 0,
    },
    stats: { launches: 0, saves: 0, shorn: 0, pets: 0 },
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
    fleeces: Array.isArray(s.fleeces) ? s.fleeces : [],
  };
}

/** A new unique id for animals, fleeces and later items. */
export function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}
