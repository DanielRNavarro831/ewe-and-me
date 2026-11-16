/**
 * The single source of game time. Follows the phone's real date and time,
 * plus an optional debug offset for testing (fast-forward).
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

let offsetMs = 0;

export const clock = {
  setDebugOffset(ms: number): void {
    offsetMs = ms;
  },
  get debugOffset(): number {
    return offsetMs;
  },
  now(): number {
    return Date.now() + offsetMs;
  },
  date(): Date {
    return new Date(this.now());
  },
};

/**
 * Time passed since `then`. If the phone's clock moved backward, the result is
 * 0 rather than negative: nothing is ever penalized.
 */
export function elapsedSince(then: number, now = clock.now()): number {
  return Math.max(0, now - then);
}

/** Meteorological seasons by month; flipped for the Southern Hemisphere. */
export function seasonOf(date: Date, hemisphere: 'north' | 'south'): Season {
  const m = date.getMonth(); // 0 = Jan
  const north: Season = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  if (hemisphere === 'north') return north;
  return ({ winter: 'summer', spring: 'autumn', summer: 'winter', autumn: 'spring' } as const)[north];
}

/** Count of 6 a.m. boundaries crossed between two times (for daily refreshes). */
export function dailyRefreshesBetween(from: number, to: number, hour = 6): number {
  if (to <= from) return 0;
  const first = new Date(from);
  first.setHours(hour, 0, 0, 0);
  if (first.getTime() <= from) first.setDate(first.getDate() + 1);
  let count = 0;
  const d = new Date(first);
  while (d.getTime() <= to && count < 400) {
    count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export interface Lighting {
  /** Overlay color (0xRRGGBB) and alpha laid over every scene. */
  color: number;
  alpha: number;
  /** Sky color for windows and outdoor backdrops. */
  sky: number;
  label: 'night' | 'dawn' | 'morning' | 'day' | 'dusk' | 'evening';
}

// keyframes by hour: [hour, overlay color, alpha, sky]
const KEYS: [number, number, number, number][] = [
  [0, 0x1c2346, 0.5, 0x23294a],
  [5, 0x1c2346, 0.45, 0x2e3557],
  [6.5, 0xf2a35e, 0.18, 0xf2b98a],
  [8, 0xfff1d6, 0.05, 0x8bbbd9],
  [12, 0xffffff, 0.0, 0x8bbbd9],
  [17, 0xffe0b0, 0.06, 0x9cc3db],
  [19, 0xe8784a, 0.22, 0xe89a6a],
  [20.5, 0x4a3570, 0.35, 0x5a4a7a],
  [22, 0x1c2346, 0.48, 0x2a2f52],
  [24, 0x1c2346, 0.5, 0x23294a],
];

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

export function lightingAt(date: Date): Lighting {
  const h = date.getHours() + date.getMinutes() / 60;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, c0, a0, s0] = KEYS[i];
  const [h1, c1, a1, s1] = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (h - h0) / (h1 - h0)));
  const label: Lighting['label'] =
    h < 5.5 ? 'night' : h < 7.5 ? 'dawn' : h < 11 ? 'morning' : h < 17.5 ? 'day' : h < 20 ? 'dusk' : h < 22 ? 'evening' : 'night';
  return { color: lerpColor(c0, c1, t), alpha: a0 + (a1 - a0) * t, sky: lerpColor(s0, s1, t), label };
}
