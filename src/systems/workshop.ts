import type { FiberItem, FiberKind, GameState, Prep, Yarn } from './state';
import { newId } from './state';
import { breed, naturalColor } from '../data/breeds';
import { weightForWpi, whorl, type WhorlRatio } from '../data/yarnWeights';
import { gradeOf, yarnScore } from './quality';
import { clock } from './clock';

/**
 * The processing chain, as pure state changes. Each minigame measures how the
 * step went and calls one of these, which replaces the fiber item with the next.
 *
 *   fleece → skirted → clean (or a felt batt) → rolags → singles → plied → skein
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function fiberOf(state: GameState, kind: FiberKind | FiberKind[]): FiberItem[] {
  const kinds = Array.isArray(kind) ? kind : [kind];
  return state.fiber.filter((f) => kinds.includes(f.kind));
}

function replace(state: GameState, old: FiberItem, next: Omit<FiberItem, 'id' | 'createdAt'>): FiberItem {
  const item: FiberItem = { ...next, id: newId(state, 'f'), createdAt: clock.now() };
  state.fiber = state.fiber.filter((f) => f.id !== old.id);
  state.fiber.push(item);
  return item;
}

/* ---------- names ---------- */

export const KIND_NAMES: Record<FiberKind, string> = {
  fleece: 'Raw fleece',
  skirted: 'Skirted fleece',
  clean: 'Clean wool',
  felt: 'Felt batt',
  rolags: 'Rolags',
  top: 'Combed top',
  singles: 'Singles',
  plied: 'Plied yarn',
};

export function fiberName(f: FiberItem): string {
  const b = breed(f.breedId);
  const color = naturalColor(b, f.colorId).name;
  if (f.kind === 'singles') return `${color} ${b.name} singles`;
  if (f.kind === 'plied') return `${color} ${b.name} ${f.chainPlied ? 'chain-plied' : `${f.plies}-ply`}`;
  return `${color} ${b.name} ${KIND_NAMES[f.kind].toLowerCase()}`;
}

export function yarnName(y: Yarn): string {
  const b = breed(y.breedId);
  const color = y.dye ? y.dye.colorway : naturalColor(b, y.colorId).name;
  const ply = y.plies === 1 ? (y.tags.includes('art yarn') ? 'thick-and-thin singles' : 'singles') : y.chainPlied ? 'chain-plied' : `${y.plies}-ply`;
  return `${color} ${b.name}, ${ply} ${weightForWpi(y.wpi).name}`;
}

/* ---------- 1. skirt ---------- */

/**
 * Skirting: removing tags, belly wool and VM-heavy edges.
 * `badRemoved` and `goodRemoved` are the fractions of bad and good locks pulled away.
 * Over-skirting wastes good wool; under-skirting leaves VM.
 */
export function skirt(state: GameState, f: FiberItem, badRemoved: number, goodRemoved: number, keptFraction: number): FiberItem {
  const bonus = Math.round(clamp(20 * badRemoved - 30 * goodRemoved, 0, 20));
  return replace(state, f, {
    ...f,
    kind: 'skirted',
    grams: Math.max(1, Math.round(f.grams * keptFraction)),
    score: clamp(f.score + bonus, 0, 100),
    skirtBonus: bonus,
    tags: [...f.tags, ...(badRemoved < 0.5 ? ['some VM'] : [])],
  });
}

/* ---------- 2. scour ---------- */

/** Water hot enough to melt the lanolin, by how greasy the breed is. */
export function lanolinMeltC(breedId: string): number {
  const g = breed(breedId).grease;
  return g === 'heavy' ? 60 : g === 'medium' ? 52 : 45;
}

export interface ScourResult {
  felted: boolean;
  washTempC: number;
  usedWoolWash: boolean;
}

/** Scouring washes out lanolin, suint and dirt: output weight = skirted weight × scoured yield. */
export function scour(state: GameState, f: FiberItem, r: ScourResult): FiberItem {
  const b = breed(f.breedId);
  if (r.felted) {
    return replace(state, f, { ...f, kind: 'felt', grams: Math.round(f.grams * b.scouredYield), tags: [...f.tags, 'felted'] });
  }
  const greasy = r.washTempC < lanolinMeltC(f.breedId) || !r.usedWoolWash;
  // Lanolin left behind adds a little weight and makes the wool tacky to spin.
  const yieldFrac = greasy ? Math.min(1, b.scouredYield + 0.06) : b.scouredYield;
  return replace(state, f, {
    ...f,
    kind: 'clean',
    grams: Math.round(f.grams * yieldFrac),
    score: clamp(f.score - (greasy ? 6 : 0), 0, 100),
    tags: [...f.tags.filter((t) => t !== 'some VM'), ...(greasy ? ['still greasy'] : [])],
  });
}

/* ---------- 3. prepare ---------- */

/** Hand carding into rolags for woolen spinning. `quality` 0..1 from the carding minigame. */
export function cardIntoRolags(state: GameState, f: FiberItem, quality: number): FiberItem {
  const mod = Math.round((quality - 0.5) * 6); // −3..+3
  return replace(state, f, {
    ...f,
    kind: 'rolags',
    grams: Math.round(f.grams * 0.97), // a few short bits stay in the card cloth
    score: clamp(f.score + mod, 0, 100),
    tags: [...f.tags, ...(quality < 0.4 ? ['a few neps'] : [])],
  });
}

/* ---------- 4. spin ---------- */

export type DraftStyle = 'long' | 'short';

export interface SpinSetup {
  style: DraftStyle;
  whorl: WhorlRatio['id'];
  /** Fraction of the prepared fiber to spin onto this bobbin. */
  portion: number;
  art: boolean;
}

export interface SpinResult {
  evenness: number;
  /** Average spun thickness divided by the target thickness. */
  thicknessRatio: number;
  twist: 'under' | 'balanced' | 'over';
}

export function prepFor(kind: FiberKind, style: DraftStyle): Prep {
  const carded = kind === 'rolags';
  if (carded) return style === 'long' ? 'woolen' : 'semi-worsted';
  return style === 'short' ? 'worsted' : 'semi-worsted';
}

/** Spins part (or all) of a prepared batch into a bobbin of singles. The rest stays prepared. */
export function spin(state: GameState, f: FiberItem, setup: SpinSetup, r: SpinResult): FiberItem {
  const grams = Math.max(1, Math.round(f.grams * clamp(setup.portion, 0.05, 1)));
  const w = whorl(setup.whorl);
  const wpi = round1(clamp(w.targetWpi / Math.max(0.35, r.thicknessRatio), 3, 40));
  const singles: FiberItem = {
    ...f,
    id: newId(state, 'f'),
    createdAt: clock.now(),
    kind: 'singles',
    grams,
    prep: prepFor(f.kind, setup.style),
    wpi,
    evenness: Math.round(r.evenness),
    twist: r.twist,
    tags: [...f.tags.filter((t) => t !== 'a few neps'), ...(setup.art ? ['art yarn', 'thick-and-thin'] : [])],
  };
  const left = f.grams - grams;
  state.fiber = state.fiber.filter((x) => x.id !== f.id);
  if (left >= 5) state.fiber.push({ ...f, grams: left });
  state.fiber.push(singles);
  return singles;
}

/* ---------- 5. ply ---------- */

/** Plied WPI from singles WPI: n strands are about √n times as thick, a touch less once they bloom together. */
export function pliedWpi(singlesWpi: number, plies: number): number {
  return round1((singlesWpi / Math.sqrt(plies)) * 1.05);
}

/**
 * Plies 2–3 bobbins together, or chain-plies one bobbin into a 3-ply that keeps
 * color sequences intact. `balance` 0..100 from the plying minigame.
 */
export function ply(state: GameState, bobbins: FiberItem[], chain: boolean, balance: number): FiberItem {
  const plies = chain ? 3 : bobbins.length;
  const grams = bobbins.reduce((s, b) => s + b.grams, 0);
  const avg = (k: 'wpi' | 'evenness' | 'score') => bobbins.reduce((s, b) => s + (b[k] ?? 0) * b.grams, 0) / grams;
  const first = bobbins[0];
  const item: FiberItem = {
    ...first,
    id: newId(state, 'f'),
    createdAt: clock.now(),
    kind: 'plied',
    grams,
    score: Math.round(avg('score')),
    evenness: Math.round(avg('evenness')),
    wpi: pliedWpi(avg('wpi'), plies),
    plies,
    chainPlied: chain,
    plyBalance: Math.round(balance),
    from: [...new Set(bobbins.map((b) => b.from))].join(' & '),
    tags: [...new Set(bobbins.flatMap((b) => b.tags))],
  };
  const ids = new Set(bobbins.map((b) => b.id));
  state.fiber = state.fiber.filter((x) => !ids.has(x.id));
  state.fiber.push(item);
  return item;
}

/* ---------- 6. finish ---------- */

export interface FinishResult {
  /** 0..1, how well the twist was set by soaking and thwacking. */
  set: number;
}

/** Winds, ties, soaks, thwacks and measures: turns a bobbin into a labeled skein. */
export function finish(state: GameState, f: FiberItem, r: FinishResult): Yarn {
  const plies = f.kind === 'plied' ? f.plies ?? 2 : 1;
  const singles = plies === 1;
  // Setting the twist evens out a little imbalance.
  const balance = singles ? null : Math.round(clamp((f.plyBalance ?? 50) + 10 * r.set, 0, 100));
  const twistOk = singles ? f.twist === 'balanced' || f.tags.includes('art yarn') : true;
  const finishFactor = singles ? (twistOk ? 0.6 : 0.3) + 0.4 * r.set : 0.4 * r.set + 0.6 * ((balance ?? 0) / 100);
  const wpi = f.wpi ?? 12;
  const weight = weightForWpi(wpi);
  const evenness = f.tags.includes('art yarn') ? Math.max(f.evenness ?? 60, 70) : f.evenness ?? 60;
  const score = yarnScore(f.score, evenness, finishFactor);
  const yarn: Yarn = {
    id: newId(state, 'y'),
    breedId: f.breedId,
    colorId: f.colorId,
    from: f.from,
    prep: f.prep ?? 'woolen',
    plies,
    chainPlied: !!f.chainPlied,
    wpi,
    weightId: weight.id,
    grams: f.grams,
    yards: Math.round((f.grams * weight.yardsPer100g) / 100),
    evenness: Math.round(evenness),
    plyBalance: balance,
    balanced: singles ? twistOk : (balance ?? 0) >= 70,
    score,
    grade: gradeOf(score),
    tags: f.tags.filter((t) => t !== 'some VM'),
    madeAt: clock.now(),
    dye: null,
  };
  state.fiber = state.fiber.filter((x) => x.id !== f.id);
  state.yarns.push(yarn);
  state.stats.skeins += 1;
  return yarn;
}

/** "Frog it": rip a skein back to fiber. Nothing is lost but the work. */
export function frog(state: GameState, y: Yarn): FiberItem {
  state.yarns = state.yarns.filter((x) => x.id !== y.id);
  state.stats.frogged += 1;
  const item: FiberItem = {
    id: newId(state, 'f'),
    kind: 'rolags',
    breedId: y.breedId,
    colorId: y.colorId,
    from: y.from,
    grams: y.grams,
    stapleCm: breed(y.breedId).fullStapleCm,
    score: Math.round((y.score - 0.3 * y.evenness - 5) / 0.6),
    createdAt: clock.now(),
    tags: ['frogged'],
  };
  item.score = clamp(item.score, 0, 100);
  state.fiber.push(item);
  return item;
}
