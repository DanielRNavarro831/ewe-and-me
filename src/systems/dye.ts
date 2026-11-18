import type { Colorway, GameState, Yarn } from './state';
import { newId } from './state';
import { ACIDS, DRYING_MINUTES, DYES, POT_CAPACITY, TECHNIQUES, type Dye, type DyeAmounts, type Technique } from '../data/dyes';
import { shopLevel } from '../data/shopLevels';
import { breed, naturalColor } from '../data/breeds';
import { dyedColor, lotVariation, tonal } from './color';
import { isOnShelf } from './economy';
import { clock } from './clock';

/**
 * The acid dye process, as state changes. The dye pot minigame measures how
 * the bath went (pre-soak, acid, heat) and calls `dyeBatch`.
 */

export const NO_DYE: DyeAmounts = { red: 0, yellow: 0, blue: 0, black: 0 };

export function potCapacity(state: GameState): number {
  if (state.upgrades.includes('dye_pot_10')) return 10;
  if (state.upgrades.includes('dye_pot_6')) return 6;
  return POT_CAPACITY;
}

export function isDrying(y: Yarn, now = clock.now()): boolean {
  return !!y.dryingUntil && y.dryingUntil > now;
}

/** Undyed skeins that aren't on a shelf or drying. */
export function dyeable(state: GameState): Yarn[] {
  return state.yarns.filter((y) => !y.dye && !isDrying(y) && !isOnShelf(state, y.id));
}

export function availableDyes(state: GameState): Dye[] {
  return DYES.filter((d) => state.stats.dyeBatches >= d.unlockAfterBatches);
}

export function techniqueUnlocked(state: GameState, t: Technique): boolean {
  return t.shopLevel !== null && shopLevel(state.reputation) >= t.shopLevel;
}

/** Techniques this milestone can actually play (immersion and kettle). */
export function playableTechniques(): Technique[] {
  return TECHNIQUES.filter((t) => t.id === 'immersion' || t.id === 'kettle');
}

export function acid(state: GameState) {
  return state.upgrades.includes('citric_acid') ? ACIDS[1] : ACIDS[0];
}

/** Grams of dye powder and ml of 1% stock for a DOS % on a weight of fiber. */
export function stockMl(dosPct: number, grams: number): number {
  // DOS = g dye / g fiber; 1 ml of 1% stock = 0.01 g of dye
  return Math.round(((dosPct / 100) * grams) / 0.01);
}

export function dosFromMl(ml: number, grams: number): number {
  return grams > 0 ? ((ml * 0.01) / grams) * 100 : 0;
}

/** Swatch color: the recipe on white wool, fully exhausted. */
export function recipeHex(dos: DyeAmounts): string {
  return dyedColor({ dos, baseHex: '#FFF8EC', luster: 'medium', crimp: 'high' });
}

export function sameRecipe(a: DyeAmounts, b: DyeAmounts, tol = 0.05): boolean {
  return (['red', 'yellow', 'blue', 'black'] as const).every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) <= tol);
}

export function findColorway(state: GameState, dos: DyeAmounts, technique: string): Colorway | undefined {
  return state.colorways.find((c) => c.technique === technique && sameRecipe(c.dos, dos));
}

export interface BathResult {
  /** The measured recipe, DOS % per dye. */
  dos: DyeAmounts;
  technique: Technique['id'];
  /** Fraction of the dye that moved into the fiber, 0..1. */
  uptake: number;
  presoaked: boolean;
}

export interface BatchOutcome {
  lot: string;
  colorway: Colorway;
  isNew: boolean;
  yarns: Yarn[];
}

/**
 * Dyes a batch of skeins. They share one lot number; the same recipe dyed again
 * later gets a new lot with a tiny, realistic variation.
 */
export function dyeBatch(state: GameState, yarnIds: string[], bath: BathResult, colorwayName: string): BatchOutcome {
  const lotN = state.nextLot++;
  const lot = String(lotN).padStart(3, '0');
  let colorway = findColorway(state, bath.dos, bath.technique);
  const isNew = !colorway;
  if (!colorway) {
    colorway = {
      id: newId(state, 'c'),
      name: colorwayName.trim() || 'Untitled colorway',
      dos: { ...bath.dos },
      technique: bath.technique,
      hex: recipeHex(bath.dos),
      createdAt: clock.now(),
      lots: [],
    };
    state.colorways.push(colorway);
  }
  colorway.lots.push(lot);

  const taken: DyeAmounts = {
    red: bath.dos.red * bath.uptake,
    yellow: bath.dos.yellow * bath.uptake,
    blue: bath.dos.blue * bath.uptake,
    black: bath.dos.black * bath.uptake,
  };
  const yarns: Yarn[] = [];
  for (const id of yarnIds) {
    const y = state.yarns.find((v) => v.id === id);
    if (!y) continue;
    const b = breed(y.breedId);
    const base = naturalColor(b, y.colorId).hex;
    const hex = lotVariation(dyedColor({ dos: taken, baseHex: base, luster: b.luster, crimp: b.crimp }), lotN);
    y.dye = {
      colorway: colorway.name,
      colorwayId: colorway.id,
      lot,
      technique: bath.technique,
      hex,
      ...(bath.technique === 'kettle' ? { tones: tonal(hex) } : {}),
    };
    if (!bath.presoaked && !y.tags.includes('blotchy')) y.tags.push('blotchy');
    y.dryingUntil = clock.now() + DRYING_MINUTES * 60_000;
    yarns.push(y);
  }
  state.stats.dyeBatches += 1;
  return { lot, colorway, isNew, yarns };
}

/** CSS background for a skein swatch: solid, or tonal for kettle-dyed yarn. */
export function swatchCss(y: Yarn): string {
  if (y.dye?.tones) return `conic-gradient(${y.dye.tones[0]}, ${y.dye.hex}, ${y.dye.tones[1]}, ${y.dye.hex}, ${y.dye.tones[0]})`;
  return y.dye?.hex ?? naturalColor(breed(y.breedId), y.colorId).hex;
}
