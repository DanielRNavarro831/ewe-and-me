import type { GameState, Sale, Yarn } from './state';
import { breed, naturalColor } from '../data/breeds';
import { weightForWpi, YARN_WEIGHTS } from '../data/yarnWeights';
import {
  ART_YARN_WEIGHT_MULT, BALANCED_PLY_BONUS, DEMAND_MAX, DEMAND_MIN, DYE_MULT, MAX_NUDGE, QUALITY_MULT, SEASONAL_DEMAND,
  type ColorFamily,
} from '../data/pricing';
import { clock, seasonOf } from './clock';
import { yarnName } from './workshop';

/* ---------- describing yarn ---------- */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** Color families used by customers' tastes and seasonal demand. */
export function colorFamilies(y: Yarn): ColorFamily[] {
  if (!y.dye) return [y.colorId === 'white' ? 'white' : 'natural'];
  const { h, s, l } = hexToHsl(y.dye.hex);
  const out: ColorFamily[] = [];
  if (l > 0.72 && s > 0.15) out.push('pastel');
  if (l < 0.35) out.push('deep');
  if (s > 0.55 && l >= 0.35 && l <= 0.72) out.push('bright');
  if (s > 0.15) out.push(h < 70 || h >= 320 ? 'warm' : 'cool');
  return out.length ? out : ['natural'];
}

export function yarnHex(y: Yarn): string {
  return y.dye?.hex ?? naturalColor(breed(y.breedId), y.colorId).hex;
}

/* ---------- pricing ---------- */

export interface PriceBreakdown {
  base: number;
  grams: number;
  weight: number;
  quality: number;
  dye: number;
  demand: number;
  demandWhy: string[];
  balanced: number;
  nudge: number;
  /** Price before Madhu's nudge. */
  list: number;
  /** Final shelf price, whole dollars. */
  price: number;
}

export function demandFor(y: Yarn, state: GameState): { mult: number; why: string[] } {
  const season = seasonOf(clock.date(), state.settings.hemisphere);
  const fams = colorFamilies(y);
  let mult = 1;
  const why: string[] = [];
  for (const rule of SEASONAL_DEMAND[season]) {
    const hitW = rule.weights?.includes(y.weightId);
    const hitC = rule.colors?.some((c) => fams.includes(c));
    if (hitW || hitC) {
      mult *= rule.mult;
      why.push(rule.why);
    }
  }
  // The weekly trend joins in M6.
  return { mult: Math.max(DEMAND_MIN, Math.min(DEMAND_MAX, mult)), why };
}

export function priceOf(y: Yarn, state: GameState): PriceBreakdown {
  const b = breed(y.breedId);
  const art = y.tags.includes('art yarn');
  const weight = art ? ART_YARN_WEIGHT_MULT : (YARN_WEIGHTS.find((w) => w.id === y.weightId) ?? weightForWpi(y.wpi)).priceMultiplier;
  const quality = QUALITY_MULT[y.grade];
  const dye = y.dye ? DYE_MULT[y.dye.technique] ?? 1.2 : DYE_MULT[y.colorId === 'white' ? 'white' : 'natural'];
  const { mult: demand, why } = demandFor(y, state);
  const balanced = y.balanced && y.plies > 1 ? BALANCED_PLY_BONUS : 1;
  const list = b.basePer100g * (y.grams / 100) * weight * quality * dye * demand * balanced;
  const nudge = state.shop.nudges[y.id] ?? 0;
  return {
    base: b.basePer100g,
    grams: y.grams,
    weight,
    quality,
    dye,
    demand,
    demandWhy: why,
    balanced,
    nudge,
    list,
    price: Math.max(1, Math.round(list * (1 + nudge))),
  };
}

export function setNudge(state: GameState, yarnId: string, nudge: number): void {
  const n = Math.max(-MAX_NUDGE, Math.min(MAX_NUDGE, Math.round(nudge * 20) / 20));
  if (n === 0) delete state.shop.nudges[yarnId];
  else state.shop.nudges[yarnId] = n;
}

/* ---------- shelves ---------- */

export function shelfYarns(state: GameState): Yarn[] {
  return state.shop.shelf.map((id) => state.yarns.find((y) => y.id === id)).filter((y): y is Yarn => !!y);
}

export function isOnShelf(state: GameState, yarnId: string): boolean {
  return state.shop.shelf.includes(yarnId);
}

export function placeOnShelf(state: GameState, slot: number, yarnId: string | null): void {
  const shelf = state.shop.shelf;
  while (shelf.length < state.shop.slots) shelf.push(null);
  if (yarnId) {
    const existing = shelf.indexOf(yarnId);
    if (existing >= 0) shelf[existing] = null;
  }
  shelf[slot] = yarnId;
}

/** Removes stale ids (frogged or sold skeins) from the shelves. */
export function tidyShelves(state: GameState): void {
  const ids = new Set(state.yarns.map((y) => y.id));
  state.shop.shelf = state.shop.shelf.map((id) => (id && ids.has(id) ? id : null));
  while (state.shop.shelf.length < state.shop.slots) state.shop.shelf.push(null);
}

/* ---------- selling ---------- */

export function sell(state: GameState, y: Yarn, price: number, tip: number, rep: number, by: Sale['by']): Sale {
  const sale: Sale = { yarnId: y.id, name: yarnName(y), price, tip, by, at: clock.now() };
  state.money += price + tip;
  state.reputation += rep;
  state.stats.sold += 1;
  state.stats.earned += price + tip;
  state.yarns = state.yarns.filter((x) => x.id !== y.id);
  delete state.shop.nudges[y.id];
  state.shop.shelf = state.shop.shelf.map((id) => (id === y.id ? null : id));
  state.shop.sales.push(sale);
  if (state.shop.sales.length > 60) state.shop.sales.splice(0, state.shop.sales.length - 60);
  return sale;
}

export function todaysEarnings(state: GameState): number {
  const d = clock.date();
  d.setHours(0, 0, 0, 0);
  return state.shop.sales.filter((s) => s.at >= d.getTime()).reduce((a, s) => a + s.price + s.tip, 0);
}
