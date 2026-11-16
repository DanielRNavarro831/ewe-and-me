/**
 * The whole game lives in one versioned JSON object.
 *
 * To change the save format:
 *   1. bump SAVE_VERSION,
 *   2. add a migration from the previous version in MIGRATIONS,
 *   3. update GameState and newGame().
 * Old saves are then upgraded step by step on load, so nothing is ever lost.
 */

export const SAVE_VERSION = 1;

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
  settings: Settings;
  stats: {
    launches: number;
    saves: number;
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
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      hemisphere: 'north',
      knittingCircleDay: 6,
      debugTimeOffsetMs: 0,
    },
    stats: { launches: 0, saves: 0 },
  };
}

type Migration = (old: any) => any;

/** MIGRATIONS[n] upgrades a version-n save to version n+1. */
const MIGRATIONS: Record<number, Migration> = {
  // 1: (s) => ({ ...s, version: 2, newField: defaultValue }),
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
    positions: { ...(s.positions ?? {}) },
  };
}
