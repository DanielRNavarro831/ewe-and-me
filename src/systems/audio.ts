import { hasAudioOverride } from './assets';
import { game } from '../game';

/**
 * Sound effects: an override file (public/assets/audio/sfx/<key>.mp3) if present,
 * otherwise a tiny synthesized placeholder. Music arrives in M7.
 */

type Tone = { f: number; to?: number; d: number; type?: OscillatorType; v?: number; delay?: number };

/** Placeholder recipes. Keys without a recipe fall back to a soft tap. */
const RECIPES: Record<string, Tone[]> = {
  ui_tap: [{ f: 880, to: 660, d: 0.05, type: 'triangle', v: 0.25 }],
  page_turn: [
    { f: 520, to: 780, d: 0.08, type: 'triangle', v: 0.18 },
    { f: 780, to: 1040, d: 0.06, type: 'triangle', v: 0.12, delay: 0.06 },
  ],
  achievement_chime: [
    { f: 784, d: 0.12, type: 'sine', v: 0.25 },
    { f: 988, d: 0.12, type: 'sine', v: 0.25, delay: 0.1 },
    { f: 1175, d: 0.25, type: 'sine', v: 0.25, delay: 0.2 },
  ],
  coin: [
    { f: 988, d: 0.06, type: 'square', v: 0.12 },
    { f: 1319, d: 0.18, type: 'square', v: 0.12, delay: 0.06 },
  ],
};

let ctx: AudioContext | null = null;
const fileCache = new Map<string, HTMLAudioElement>();

function audioCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Browsers only allow audio after a touch; call this from the first one. */
export function unlockAudio(): void {
  audioCtx();
}

export function playSfx(key: string): void {
  const volume = game.state?.settings.sfxVolume ?? 0.8;
  if (volume <= 0) return;

  if (hasAudioOverride('sfx', key)) {
    let el = fileCache.get(key);
    if (!el) {
      el = new Audio(`assets/audio/sfx/${key}.mp3`);
      fileCache.set(key, el);
    }
    const inst = el.cloneNode(true) as HTMLAudioElement;
    inst.volume = volume;
    void inst.play().catch(() => {});
    return;
  }

  const ac = audioCtx();
  if (!ac) return;
  const tones = RECIPES[key] ?? RECIPES.ui_tap;
  const t0 = ac.currentTime;
  for (const tone of tones) {
    const start = t0 + (tone.delay ?? 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.f, start);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.d);
    const peak = (tone.v ?? 0.2) * volume;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.d);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + tone.d + 0.02);
  }
}
