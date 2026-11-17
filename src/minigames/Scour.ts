import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import { scour, lanolinMeltC } from '../systems/workshop';
import { unlock } from '../systems/achievements';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';
import { breed } from '../data/breeds';
import { el } from '../ui/modal';

type Phase = 'setWash' | 'wash' | 'setRinse' | 'rinse' | 'done';

const SOAK_MS = 3500;

/**
 * Scouring: choose the water temperature and add wool wash, then press the
 * fleece down gently with a slow hold. Agitation (moving while pressing) and
 * sudden hot-to-cold changes raise the felting meter. A full meter makes a
 * felt batt, which is still useful, so even a mistake produces something.
 */
export class ScourScene extends Minigame {
  private phase: Phase = 'setWash';
  private temp = 50;
  private washTemp = 50;
  private woolWash = false;
  private felt = 0;
  private soak = 0;
  private holding = false;
  private last: { x: number; y: number } | null = null;
  private fleece!: Phaser.GameObjects.Ellipse;
  private water!: Phaser.GameObjects.Ellipse;
  private ui!: HTMLElement;
  private feltBar!: HTMLElement;
  private soakBar!: HTMLElement;
  private tubY = 0;

  constructor() {
    super('Scour');
  }

  create(): void {
    this.phase = 'setWash';
    this.temp = 50;
    this.felt = 0;
    this.soak = 0;
    this.woolWash = false;
    this.holding = false;
    this.setup('Scouring', 'wood');
    const { main } = this.fiberColors();
    const cx = this.W / 2;
    this.tubY = Math.round(this.H * 0.36);

    this.add.ellipse(cx, this.tubY + 6, 232, 132, hex('o'));
    this.add.ellipse(cx, this.tubY, 228, 122, hex('m'));
    this.add.ellipse(cx, this.tubY - 4, 210, 100, hex('l'));
    this.water = this.add.ellipse(cx, this.tubY - 2, 196, 88, hex('b'));
    this.fleece = this.add.ellipse(cx, this.tubY - 12, 110, 46, main).setStrokeStyle(2, hex('o'));
    this.time.addEvent({ delay: 400, loop: true, callback: () => this.steam() });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if ((this.phase === 'wash' || this.phase === 'rinse') && this.fleece.getBounds().contains(p.worldX, p.worldY + 10)) {
        this.holding = true;
        this.last = { x: p.worldX, y: p.worldY };
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.holding || !p.isDown || !this.last) return;
      const moved = Phaser.Math.Distance.Between(this.last.x, this.last.y, p.worldX, p.worldY);
      this.last = { x: p.worldX, y: p.worldY };
      // Agitation in hot water is what felts wool.
      if (moved > 1.5) this.addFelt(moved * 0.35 * (this.temp / 55));
    });
    this.input.on('pointerup', () => {
      this.holding = false;
      this.last = null;
    });

    this.ui = this.controls();
    this.showSetup();
  }

  private showSetup(): void {
    const rinse = this.phase === 'setRinse';
    const b = breed(this.item.breedId);
    this.hint.set(
      rinse
        ? 'Now the rinse. Choose the rinse water temperature.'
        : `${b.name} has ${b.grease} lanolin. Choose the wash water temperature and add wool wash.`,
    );
    this.ui.innerHTML = '';
    const read = el('strong', {});
    const slider = el('input', { type: 'range', min: '30', max: '85', step: '1', value: String(this.temp) });
    const show = () => (read.textContent = `${this.temp}°C (${Math.round((this.temp * 9) / 5 + 32)}°F)`);
    slider.addEventListener('input', () => {
      this.temp = Number(slider.value);
      show();
      this.tintWater();
    });
    show();
    this.ui.append(el('label', { className: 'row' }, [el('span', { textContent: 'Water' }), slider, read]));
    if (!rinse) {
      const ww = el('button', { className: 'btn', textContent: 'Add wool wash' });
      ww.addEventListener('click', () => {
        this.woolWash = true;
        ww.textContent = 'Wool wash added ✓';
        ww.disabled = true;
        playSfx('water_slosh');
        for (let i = 0; i < 6; i++) this.fx('fx_sparkle', this.W / 2 + Phaser.Math.Between(-70, 70), this.tubY + Phaser.Math.Between(-20, 20));
      });
      this.ui.append(ww);
    }
    const go = el('button', { className: 'btn primary', textContent: rinse ? 'Lower it into the rinse' : 'Lower the fleece in' });
    go.addEventListener('click', () => this.startSoak());
    this.ui.append(go);
    this.tintWater();
  }

  private startSoak(): void {
    if (this.phase === 'setWash') {
      this.washTemp = this.temp;
      this.phase = 'wash';
    } else {
      // Sudden temperature changes shock the scales into locking together.
      const shock = Math.max(0, Math.abs(this.temp - this.washTemp) - 15) * 4;
      this.phase = 'rinse';
      if (shock > 0) this.addFelt(shock);
    }
    if (this.phase === ('done' as Phase)) return;
    playSfx('water_slosh');
    this.soak = 0;
    this.hint.set('Press and hold the fleece to sink it gently. Keep your finger still.');
    this.ui.innerHTML = '';
    this.soakBar = el('div', { className: 'bar-fill' });
    this.feltBar = el('div', { className: 'bar-fill' });
    this.feltBar.style.background = 'var(--rose)';
    this.soakBar.style.width = '0%';
    this.feltBar.style.width = `${Math.min(100, this.felt)}%`;
    this.ui.append(
      el('span', { textContent: this.phase === 'wash' ? 'Soaking in the wash' : 'Rinsing' }),
      el('div', { className: 'bar' }, [this.soakBar]),
      el('span', { textContent: 'Felting' }),
      el('div', { className: 'bar' }, [this.feltBar]),
    );
  }

  private addFelt(n: number): void {
    if (this.phase === 'done') return;
    this.felt = Math.min(100, this.felt + n);
    if (this.feltBar) this.feltBar.style.width = `${this.felt}%`;
    if (this.felt >= 100) this.complete(true);
  }

  private tintWater(): void {
    // cooler blue → warmer, cloudier water
    const t = Phaser.Math.Clamp((this.temp - 30) / 55, 0, 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(hex('b')),
      Phaser.Display.Color.ValueToColor(this.phase === 'setRinse' || this.phase === 'rinse' ? hex('b') : 0xc9c2a0),
      100,
      Math.round(t * 60),
    );
    this.water.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
  }

  private steam(): void {
    if (this.temp < 55 || this.phase === 'done') return;
    const s = this.add.rectangle(this.W / 2 + Phaser.Math.Between(-80, 80), this.tubY - 30, 2, 2, hex('w')).setAlpha(0.8);
    this.tweens.add({ targets: s, y: s.y - 30, alpha: 0, duration: 1200, onComplete: () => s.destroy() });
  }

  update(_t: number, delta: number): void {
    if (this.phase !== 'wash' && this.phase !== 'rinse') {
      this.fleece.y = this.tubY - 12 + Math.sin(this.time.now / 500) * 2;
      return;
    }
    const sunk = this.holding ? 1 : 0;
    this.fleece.y = Phaser.Math.Linear(this.fleece.y, this.tubY - 12 + sunk * 16, 0.08);
    this.fleece.setAlpha(this.holding ? 0.75 : 1);
    if (this.holding) {
      this.soak += delta;
      this.soakBar.style.width = `${Math.min(100, (this.soak / SOAK_MS) * 100)}%`;
      if (Math.random() < 0.05) this.fx('fx_sparkle', this.fleece.x + Phaser.Math.Between(-40, 40), this.fleece.y - 10);
      if (this.soak >= SOAK_MS) {
        this.holding = false;
        if (this.phase === 'wash') {
          this.phase = 'setRinse';
          playSfx('water_slosh');
          // the dirty wash water goes, fresh water comes in
          this.water.setFillStyle(0xb3a776);
          this.time.delayedCall(500, () => this.showSetup());
        } else {
          this.complete(false);
        }
      }
    }
  }

  private complete(felted: boolean): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.holding = false;
    this.ui.innerHTML = '';
    const before = this.item.grams;
    const out = scour(game.state, this.item, { felted, washTempC: this.washTemp, usedWoolWash: this.woolWash });
    game.changed();
    if (felted) {
      playSfx('felt_oops');
      this.fleece.setFillStyle(hex('F')).setScale(0.8, 0.7);
      unlock('felted_again');
      this.result(
        'It felted!',
        [
          ['Felt batt', `${out.grams} g`],
          ['From', `${before} g skirted fleece`],
        ],
        'Too much agitation or a sudden temperature change locked the scales together. The felt batt is kept in your stash for felting projects later.',
      );
      return;
    }
    playSfx('fleece_drop');
    const need = lanolinMeltC(this.item.breedId);
    const greasy = out.tags.includes('still greasy');
    this.result(
      'Clean and drying',
      [
        ['Clean wool', `${out.grams} g`],
        ['From', `${before} g skirted fleece`],
        ['Fiber quality', `${out.score}`],
      ],
      greasy
        ? `Still a bit greasy: ${!this.woolWash ? 'no wool wash' : `the wash was under about ${need}°C`}, so some lanolin stayed in. It'll be a little tacky to spin.`
        : 'Lanolin, suint and dirt washed out, and no felting. Lovely clean locks.',
    );
  }
}
