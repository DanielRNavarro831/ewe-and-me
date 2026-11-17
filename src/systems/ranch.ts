import type { Animal, GameState } from './state';
import { breed } from '../data/breeds';
import { feed } from '../data/feeds';
import { clock, elapsedSince } from './clock';

/**
 * Animal simulation, computed purely from timestamps so it works the same
 * whether the app was open or closed. Growth caps at full fleece; happiness
 * drifts toward 50 and never below. Nothing is ever lost while away.
 */

const HOUR = 36e5;
/** Happiness points lost per hour while above 50. */
const HAPPINESS_DRIFT_PER_HOUR = 1;

export const CARE = { pet: 5, brush: 10 };

export function dayKey(d = clock.date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Brings one animal's growth and happiness up to `now`. */
export function tickAnimal(a: Animal, state: GameState, now = clock.now()): void {
  const from = a.updatedAt;
  const span = elapsedSince(from, now);
  if (span <= 0) {
    a.updatedAt = Math.max(a.updatedAt, now);
    return;
  }
  const fullMs = breed(a.breedId).fullGrowthHours * HOUR;
  const { hayUntil, alfalfaUntil, grainUntil } = state.feed;

  // Split the time into pieces where the trough contents don't change.
  const cuts = [from, now, hayUntil, alfalfaUntil, grainUntil].filter((t) => t >= from && t <= now).sort((x, y) => x - y);
  for (let i = 0; i < cuts.length - 1 && a.growth < 1; i++) {
    const t0 = cuts[i];
    const t1 = cuts[i + 1];
    if (t1 <= t0) continue;
    const mid = (t0 + t1) / 2;
    const rate = (mid < alfalfaUntil ? feed('alfalfa').growthMultiplier : 1) / fullMs;
    const dg = Math.min(1 - a.growth, rate * (t1 - t0));
    a.growth += dg;
    if (mid < hayUntil) a.fedGrowth += dg;
    if (mid < grainUntil) a.grainGrowth += dg;
  }
  a.growth = Math.min(1, a.growth);

  if (a.happiness > 50) a.happiness = Math.max(50, a.happiness - (span / HOUR) * HAPPINESS_DRIFT_PER_HOUR);
  a.updatedAt = now;
}

export function tickAll(state: GameState, now = clock.now()): void {
  for (const a of state.animals) tickAnimal(a, state, now);
}

/** Sprite stage 0..3: shorn, one-third, two-thirds, full and fluffy. */
export function fleeceStage(growth: number): 0 | 1 | 2 | 3 {
  return growth < 0.2 ? 0 : growth < 0.55 ? 1 : growth < 0.95 ? 2 : 3;
}

export const STAGE_NAMES = ['Freshly shorn', 'One-third fleece', 'Two-thirds fleece', 'Full and fluffy'];

export const SHEAR_FROM = 0.5;

export function canShear(a: Animal): boolean {
  return a.growth >= SHEAR_FROM;
}

/** Real time until the animal reaches a growth level (ignores feed changes). */
export function msUntilGrowth(a: Animal, state: GameState, target: number, now = clock.now()): number {
  if (a.growth >= target) return 0;
  const fullMs = breed(a.breedId).fullGrowthHours * HOUR;
  const mult = now < state.feed.alfalfaUntil ? feed('alfalfa').growthMultiplier : 1;
  return ((target - a.growth) * fullMs) / mult;
}

export function stapleCm(a: Animal): number {
  return breed(a.breedId).fullStapleCm * a.growth;
}

export function rawGrams(a: Animal): number {
  return breed(a.breedId).rawFleeceG * a.growth;
}

export function hayInTrough(state: GameState, now = clock.now()): boolean {
  return now < state.feed.hayUntil;
}

export function fillHay(state: GameState, now = clock.now()): void {
  // Ticking first credits the time before the refill correctly.
  tickAll(state, now);
  state.feed.hayUntil = now + feed('hay').lastsHours * HOUR;
}

export function formatDuration(ms: number): string {
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
