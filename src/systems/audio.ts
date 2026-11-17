import { hasAudioOverride } from './assets';
import { game } from '../game';

/**
 * Sound effects: an override file (public/assets/audio/sfx/<key>.mp3) if present,
 * otherwise a tiny synthesized placeholder. Music arrives in M7.
 */

type Tone = {
  f: number;
  to?: number;
  d: number;
  /** Oscillator shape, or 'noise' for filtered white noise (f = filter frequency). */
  type?: OscillatorType | 'noise';
  v?: number;
  delay?: number;
  /** Vibrato depth in Hz (for the baa). */
  wobble?: number;
};

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
  shear_snip: [
    { f: 5200, d: 0.03, type: 'noise', v: 0.35 },
    { f: 3800, d: 0.04, type: 'noise', v: 0.25, delay: 0.05 },
  ],
  sheep_baa: [{ f: 340, to: 300, d: 0.55, type: 'sawtooth', v: 0.12, wobble: 18 }],
  card_brush: [{ f: 1800, d: 0.12, type: 'noise', v: 0.18 }],
  fleece_drop: [
    { f: 300, d: 0.18, type: 'noise', v: 0.3 },
    { f: 110, to: 70, d: 0.15, type: 'sine', v: 0.25 },
  ],
  purr: [{ f: 55, d: 0.6, type: 'sawtooth', v: 0.08, wobble: 6 }],
  shop_bell: [
    { f: 1568, d: 0.35, type: 'sine', v: 0.18 },
    { f: 2093, d: 0.45, type: 'sine', v: 0.14, delay: 0.09 },
  ],
  treadle_tap: [{ f: 180, to: 120, d: 0.07, type: 'triangle', v: 0.3 }],
  ply_twist: [
    { f: 160, to: 120, d: 0.06, type: 'triangle', v: 0.25 },
    { f: 2400, d: 0.05, type: 'noise', v: 0.08, delay: 0.02 },
  ],
  niddy_wrap: [{ f: 900, to: 1400, d: 0.05, type: 'noise', v: 0.12 }],
  thwack: [
    { f: 700, d: 0.06, type: 'noise', v: 0.5 },
    { f: 140, to: 80, d: 0.12, type: 'sine', v: 0.35 },
  ],
  water_slosh: [
    { f: 500, d: 0.3, type: 'noise', v: 0.25 },
    { f: 350, d: 0.25, type: 'noise', v: 0.15, delay: 0.15 },
  ],
  felt_oops: [{ f: 400, to: 250, d: 0.25, type: 'triangle', v: 0.2 }],
};

let noiseBuffer: AudioBuffer | null = null;
function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

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
    const gain = ac.createGain();
    const peak = (tone.v ?? 0.2) * volume;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.d);
    gain.connect(ac.destination);

    let source: AudioScheduledSourceNode;
    if (tone.type === 'noise') {
      const src = ac.createBufferSource();
      src.buffer = noise(ac);
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = tone.f;
      filter.Q.value = 1.2;
      src.connect(filter).connect(gain);
      source = src;
    } else {
      const osc = ac.createOscillator();
      osc.type = tone.type ?? 'sine';
      osc.frequency.setValueAtTime(tone.f, start);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.d);
      if (tone.wobble) {
        const lfo = ac.createOscillator();
        const depth = ac.createGain();
        lfo.frequency.value = 7;
        depth.gain.value = tone.wobble;
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(start);
        lfo.stop(start + tone.d + 0.02);
      }
      osc.connect(gain);
      source = osc;
    }
    source.start(start);
    source.stop(start + tone.d + 0.02);
  }
}
