import Phaser from 'phaser';
import { game } from '../game';
import type { FiberItem } from '../systems/state';
import { hex } from '../art/palette';
import { showHint, openModal, el, type HintBar } from '../ui/modal';
import { setTitleOverride, clearTitleOverride } from '../ui/hud';
import { breed, naturalColor } from '../data/breeds';

/**
 * Shared frame for the Workshop minigames: a close-up work surface, an
 * instruction strip with a "Later" button (nothing is lost by leaving), a
 * title in the top bar, and a results card at the end.
 */
export abstract class Minigame extends Phaser.Scene {
  protected item!: FiberItem;
  protected hint!: HintBar;
  protected W = 0;
  protected H = 0;
  protected finished = false;

  /** Where "Later" and "Done" return to. */
  protected returnTo = 'Workshop';

  init(data: { itemId: string }): void {
    const f = game.state.fiber.find((x) => x.id === data.itemId);
    if (!f) throw new Error(`No fiber item ${data.itemId}`);
    this.item = f;
    this.finished = false;
  }

  /** Call first in create(). */
  protected setup(title: string, surface: 'wood' | 'board' = 'board'): void {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.add.tileSprite(0, 0, this.W, this.H, 'tile_wood_floor').setOrigin(0);
    if (surface === 'board') {
      this.add.rectangle(this.W / 2, this.H * 0.47, this.W - 16, this.H * 0.62, hex('L')).setStrokeStyle(2, hex('o'));
    }
    setTitleOverride(title);
    this.hint = showHint('', { label: 'Later', onClick: () => this.leave() });
    this.controlsEl = null;
    this.events.once('shutdown', () => {
      this.hint.close();
      clearTitleOverride(title);
      // only this scene's own controls (another minigame may already have opened)
      this.controlsEl?.remove();
    });
  }

  /** Fleece color and shade of the item, as numbers for Phaser fills. */
  protected fiberColors(): { main: number; shade: number } {
    const c = naturalColor(breed(this.item.breedId), this.item.colorId);
    return { main: parseInt(c.hex.slice(1), 16), shade: parseInt(c.shade.slice(1), 16) };
  }

  protected leave(): void {
    this.scene.start(this.returnTo);
  }

  /**
   * A row of DOM controls docked at the bottom of the play area (sliders, toggles),
   * used where a real control reads better than a pixel button.
   */
  protected controls(): HTMLElement {
    document.getElementById('mg-controls')?.remove();
    const div = el('div', {});
    div.id = 'mg-controls';
    document.getElementById('stage')!.appendChild(div);
    this.controlsEl = div;
    return div;
  }

  private controlsEl: HTMLElement | null = null;

  /** The end-of-step card. */
  protected result(title: string, lines: [string, string][], note: string, onDone?: () => void, doneLabel = 'Back to the workshop'): void {
    this.finished = true;
    void game.saveNow();
    openModal(title, (body, close) => {
      const dl = el('dl', { className: 'info' });
      for (const [k, v] of lines) dl.append(el('dt', { textContent: k }), el('dd', { textContent: v }));
      body.append(dl);
      if (note) body.append(el('p', { className: 'hint', textContent: note }));
      const b = el('button', { className: 'btn primary', textContent: doneLabel });
      b.addEventListener('click', () => {
        close();
        if (onDone) onDone();
        else this.leave();
      });
      body.append(el('div', { className: 'btn-row' }, [b]));
    });
  }

  /** Little floating sprite effect. */
  protected fx(key: string, x: number, y: number): void {
    const img = this.add.image(x, y, key).setDepth(500);
    this.tweens.add({ targets: img, y: y - 14, alpha: 0, duration: 700, onComplete: () => img.destroy() });
  }
}
