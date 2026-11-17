import { newGame, type GameState } from './systems/state';
import { loadGame, writeGame, requestPersistence } from './systems/save';
import { clock, elapsedSince, dailyRefreshesBetween } from './systems/clock';
import { tickAll } from './systems/ranch';

type Listener = () => void;

/**
 * The live game state plus autosave. Anything that changes the state calls
 * `game.changed()`; a save follows shortly after, and immediately when the app
 * is hidden or closed.
 */
class Game {
  state!: GameState;
  lastSavedAt = 0;
  /** Summary of what happened while away, computed on resume. */
  away: { ms: number; dailyRefreshes: number } = { ms: 0, dailyRefreshes: 0 };

  private saveTimer: number | null = null;
  private saving: Promise<void> = Promise.resolve();
  private listeners = new Set<Listener>();

  async init(): Promise<void> {
    const loaded = await loadGame();
    this.state = loaded ?? newGame(clock.now());
    clock.setDebugOffset(this.state.settings.debugTimeOffsetMs);
    this.state.stats.launches += 1;
    this.resume();
    void requestPersistence();
    await this.saveNow();

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.saveNow();
      else this.resume();
    });
    window.addEventListener('pagehide', () => void this.saveNow());
    // A gentle heartbeat keeps lastSeenAt fresh even with no actions.
    window.setInterval(() => {
      this.state.lastSeenAt = Math.max(this.state.lastSeenAt, clock.now());
      void this.saveNow();
    }, 30_000);
  }

  /**
   * Applies time that passed while the game was closed. Everything is computed
   * from timestamps, so nothing has to run in the background.
   * (Fleece growth, drying and Daniel's sales hook in here in later milestones.)
   */
  resume(): void {
    const now = clock.now();
    const ms = elapsedSince(this.state.lastSeenAt, now);
    const dailyRefreshes = dailyRefreshesBetween(this.state.lastDailyRefreshAt, now);
    if (dailyRefreshes > 0) this.state.lastDailyRefreshAt = now;
    tickAll(this.state, now);
    this.away = { ms, dailyRefreshes };
    this.state.lastSeenAt = Math.max(this.state.lastSeenAt, now);
    this.changed();
    for (const l of this.resumeListeners) l(ms);
  }

  private resumeListeners = new Set<(awayMs: number) => void>();

  /** Called with the time away whenever the game comes back to the foreground. */
  onResume(l: (awayMs: number) => void): void {
    this.resumeListeners.add(l);
  }

  /** Call after any meaningful change. */
  changed(): void {
    for (const l of this.listeners) l();
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.saveNow(), 800);
  }

  onChange(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  saveNow(): Promise<void> {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.state.lastSeenAt = Math.max(this.state.lastSeenAt, clock.now());
    this.state.stats.saves += 1;
    // Chain writes so they never interleave.
    this.saving = this.saving
      .then(() => writeGame(this.state))
      .then(() => {
        this.lastSavedAt = Date.now();
      })
      .catch((err) => console.error('[save] failed', err));
    return this.saving;
  }

  /** Replace the whole state (used by backup import). */
  async replace(state: GameState): Promise<void> {
    this.state = state;
    clock.setDebugOffset(state.settings.debugTimeOffsetMs);
    await this.saveNow();
  }

  setDebugOffset(ms: number): void {
    this.state.settings.debugTimeOffsetMs = ms;
    clock.setDebugOffset(ms);
    this.resume();
  }
}

export const game = new Game();
