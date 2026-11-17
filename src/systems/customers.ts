import type { GameState, Sale, Yarn } from './state';
import { BREEDS, breed } from '../data/breeds';
import { YARN_WEIGHTS } from '../data/yarnWeights';
import { COLOR_PREFS, LINES, TECHNIQUE_PREFS, VILLAGERS, type Pref, type VillagerLook } from '../data/customers';
import { colorFamilies, priceOf, sell, shelfYarns } from './economy';
import { pick, AWAY_NOTES_NONE, AWAY_NOTES_SOLD } from '../data/daniel';

/**
 * Walk-in customers. While the game is open, one arrives every 45–90 seconds
 * (faster as reputation grows). Each has 1–3 preferences shown in a thought
 * bubble, browses the shelves and buys the best match. A strong match adds a
 * tip of 10–25% and extra reputation. Higher prices lower the chance to buy.
 */

export interface Customer {
  look: VillagerLook;
  prefs: Pref[];
}

export interface Visit {
  customer: Customer;
  yarn: Yarn | null;
  bought: boolean;
  /** Fraction of preferences matched by the chosen yarn, 0..1. */
  match: number;
  price: number;
  tip: number;
  rep: number;
  line: string;
}

export function nextArrivalMs(reputation: number): number {
  const speedup = 1 - Math.min(0.45, reputation / 1500);
  return (45 + Math.random() * 45) * 1000 * speedup;
}

function prefFor(kind: Pref['kind'], fromYarn: Yarn | null): Pref {
  switch (kind) {
    case 'fiber': {
      const id = fromYarn?.breedId ?? pick(BREEDS).id;
      return { kind, value: id, label: breed(id).name };
    }
    case 'weight': {
      const id = fromYarn?.weightId ?? pick(YARN_WEIGHTS).id;
      return { kind, value: id, label: YARN_WEIGHTS.find((w) => w.id === id)!.name };
    }
    case 'color': {
      const fam = fromYarn ? pick(colorFamilies(fromYarn)) : pick(COLOR_PREFS).value;
      return COLOR_PREFS.find((c) => c.value === fam) ?? COLOR_PREFS[0];
    }
    case 'technique': {
      if (fromYarn) {
        const options = TECHNIQUE_PREFS.filter((p) => prefMatches(p, fromYarn));
        if (options.length) return pick(options);
      }
      return pick(TECHNIQUE_PREFS);
    }
  }
}

/** A new customer. Most tastes lean toward what's on the shelves, so matches happen often. */
export function makeCustomer(state: GameState): Customer {
  const shelf = shelfYarns(state);
  const n = 1 + Math.floor(Math.random() * 3);
  const kinds = (['fiber', 'weight', 'color', 'technique'] as const).slice().sort(() => Math.random() - 0.5).slice(0, n);
  const inspiration = shelf.length && Math.random() < 0.7 ? pick(shelf) : null;
  const prefs = kinds.map((k) => prefFor(k, inspiration && Math.random() < 0.85 ? inspiration : null));
  return { look: pick(VILLAGERS), prefs };
}

export function prefMatches(p: Pref, y: Yarn): boolean {
  switch (p.kind) {
    case 'fiber':
      return y.breedId === p.value;
    case 'weight':
      return y.weightId === p.value;
    case 'color':
      return colorFamilies(y).includes(p.value as never);
    case 'technique':
      return p.value === 'undyed'
        ? !y.dye
        : p.value === 'dyed'
          ? !!y.dye
          : p.value === 'art'
            ? y.tags.includes('art yarn')
            : p.value === 'balanced'
              ? y.balanced && y.plies > 1
              : p.value === 'woolen'
                ? y.prep === 'woolen'
                : false;
  }
}

/** The customer browses, picks the best match and decides whether to buy. */
export function decide(state: GameState, c: Customer): Visit {
  const shelf = shelfYarns(state);
  if (!shelf.length) return { customer: c, yarn: null, bought: false, match: 0, price: 0, tip: 0, rep: 0, line: pick(LINES.empty) };

  let best: Yarn = shelf[0];
  let bestMatch = -1;
  for (const y of shelf) {
    const m = c.prefs.filter((p) => prefMatches(p, y)).length / c.prefs.length;
    const better = m > bestMatch || (m === bestMatch && y.score > best.score);
    if (better) {
      best = y;
      bestMatch = m;
    }
  }
  const p = priceOf(best, state);
  // Matching tastes make a sale likely; a raised price makes it less so.
  const base = bestMatch === 0 ? 0.3 : 0.55 + 0.45 * bestMatch;
  const priceFactor = Math.max(0.3, Math.min(1.35, 1 - 1.6 * p.nudge));
  const chance = Math.min(0.97, base * priceFactor);
  const bought = Math.random() < chance;
  if (!bought) {
    return {
      customer: c, yarn: best, bought: false, match: bestMatch, price: p.price, tip: 0, rep: 0,
      line: p.nudge > 0.1 && bestMatch > 0 ? pick(LINES.pricey) : pick(LINES.nothing),
    };
  }
  const strong = bestMatch >= 0.66;
  const tip = strong ? Math.round(p.price * (0.1 + Math.random() * 0.15)) : 0;
  return {
    customer: c, yarn: best, bought: true, match: bestMatch, price: p.price, tip,
    rep: strong ? 3 : 1,
    line: strong ? pick(LINES.perfect) : pick(LINES.okay),
  };
}

/** Completes a visit: the sale, if any, goes through. */
export function completeVisit(state: GameState, v: Visit): Sale | null {
  if (!v.bought || !v.yarn) return null;
  if (!state.yarns.some((y) => y.id === v.yarn!.id)) return null; // already sold meanwhile
  return sell(state, v.yarn, v.price, v.tip, v.rep, 'customer');
}

/* ---------- Daniel minds the shop while Madhu is away ---------- */

const AWAY_PERIOD_MS = 4 * 36e5;

export interface AwaySummary {
  ms: number;
  sales: Sale[];
  note: string;
}

/**
 * Daniel sells up to `perPeriod` shelf items every 4 hours away (3 to start;
 * upgrades raise it). No tips, a little reputation for each.
 */
export function awaySales(state: GameState, awayMs: number, perPeriod = 3): AwaySummary {
  const shelf = shelfYarns(state);
  let credit = state.shop.awayCredit + (awayMs / AWAY_PERIOD_MS) * perPeriod;
  const n = Math.min(Math.floor(credit), shelf.length);
  credit -= n;
  // Credit doesn't pile up forever on empty shelves.
  state.shop.awayCredit = Math.min(credit, perPeriod);
  const sales: Sale[] = [];
  // Daniel sells the most appealing skeins first: best quality, then priciest.
  const ordered = [...shelf].sort((a, b) => b.score - a.score || priceOf(b, state).price - priceOf(a, state).price);
  for (const y of ordered.slice(0, n)) {
    const p = priceOf(y, state);
    sales.push(sell(state, y, p.price, 0, 1, 'daniel'));
  }
  const note = sales.length ? pick(AWAY_NOTES_SOLD).replace('{n}', `${sales.length} skein${sales.length > 1 ? 's' : ''}`) : pick(AWAY_NOTES_NONE);
  return { ms: awayMs, sales, note };
}
