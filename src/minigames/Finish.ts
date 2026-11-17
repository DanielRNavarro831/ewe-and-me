import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import { finish, yarnName } from '../systems/workshop';
import { weightForWpi } from '../data/yarnWeights';
import { unlock } from '../systems/achievements';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';

type Step = 'wind' | 'tie' | 'soak' | 'thwack' | 'measure' | 'done';

/** Winding always takes about this long, however big the skein. */
const WIND_SECONDS = 5;
const THWACKS = 8;

/**
 * Finishing: wind onto the niddy-noddy (2 yards per wrap, counted for you),
 * tie figure-8 ties, soak to set the twist, then thwack it. Hang to dry,
 * measure WPI with the WPI tool, and twist it into a labeled skein.
 */
export class FinishScene extends Minigame {
  private step: Step = 'wind';
  private wraps = 0;
  private targetWraps = 0;
  private holding = false;
  private ties = 0;
  private thwacks = 0;
  private tieSpots: Phaser.GameObjects.Arc[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private skein!: Phaser.GameObjects.Container;
  private niddy!: Phaser.GameObjects.Graphics;
  private lastWrapSfx = 0;

  constructor() {
    super('Finish');
  }

  create(): void {
    this.step = 'wind';
    this.wraps = 0;
    this.ties = 0;
    this.thwacks = 0;
    this.tieSpots = [];
    this.holding = false;
    this.setup('Finishing');
    const wpi = this.item.wpi ?? 12;
    const yards = (this.item.grams * weightForWpi(wpi).yardsPer100g) / 100;
    this.targetWraps = Math.max(4, Math.round(yards / 2));

    this.gfx = this.add.graphics();
    this.niddy = this.add.graphics();
    this.drawNiddy(0);
    this.label = this.add
      .text(this.W / 2, this.H * 0.47 + this.H * 0.31 - 26, '', { fontFamily: 'Pixelify Sans', fontSize: '12px', color: '#2B1E1E' })
      .setOrigin(0.5)
      .setResolution(4);
    this.updateLabel();
    this.hint.set('Press and hold to wind the yarn onto the niddy-noddy.');

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointerup', () => (this.holding = false));
  }

  private get cx(): number {
    return this.W / 2;
  }
  private get cy(): number {
    return this.H * 0.43;
  }

  private drawNiddy(fill: number): void {
    const g = this.niddy;
    const { main, shade } = this.fiberColors();
    const { cx, cy } = this;
    g.clear();
    // the niddy-noddy: a center shaft with two crossbars at right angles
    g.fillStyle(hex('o')).fillRect(cx - 80, cy - 6, 160, 12);
    g.fillStyle(hex('W')).fillRect(cx - 78, cy - 4, 156, 8);
    g.fillStyle(hex('o')).fillRect(cx - 86, cy - 50, 12, 100);
    g.fillStyle(hex('L')).fillRect(cx - 84, cy - 48, 8, 96);
    g.fillStyle(hex('o')).fillRect(cx + 70, cy - 20, 22, 40);
    g.fillStyle(hex('L')).fillRect(cx + 72, cy - 18, 18, 36);
    // wound yarn builds up over the arms
    const layers = Math.min(14, Math.round(fill * 14));
    for (let i = 0; i < layers; i++) {
      g.lineStyle(2, i % 3 === 0 ? shade : main);
      g.lineBetween(cx - 80, cy - 44 + i * 6.5, cx + 80, cy - 14 + i * 2);
    }
  }

  private updateLabel(): void {
    const yards = this.wraps * 2;
    const text: Record<Step, string> = {
      wind: `Wraps: ${this.wraps} · ${yards} yards`,
      tie: `Figure-8 ties: ${this.ties} of 4`,
      soak: 'Soaking to set the twist…',
      thwack: `Thwacks: ${this.thwacks} of ${THWACKS}`,
      measure: 'Measuring WPI…',
      done: '',
    };
    this.label.setText(text[this.step]);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.finished) return;
    if (this.step === 'wind') this.holding = true;
    else if (this.step === 'tie') {
      for (const s of this.tieSpots) {
        if (s.visible && Phaser.Math.Distance.Between(p.worldX, p.worldY, s.x, s.y) < 22) {
          s.setVisible(false);
          this.ties += 1;
          playSfx('ui_tap');
          // a little figure-8 tie
          this.gfx.lineStyle(2, hex('x')).strokeEllipse(s.x, s.y - 3, 6, 6).strokeEllipse(s.x, s.y + 3, 6, 6);
          this.updateLabel();
          if (this.ties >= 4) this.time.delayedCall(300, () => this.toSoak());
          break;
        }
      }
    } else if (this.step === 'thwack') {
      this.thwacks += 1;
      playSfx('thwack');
      this.cameras.main.shake(90, 0.008);
      this.tweens.add({ targets: this.skein, scaleY: 0.85, yoyo: true, duration: 60 });
      for (let i = 0; i < 3; i++) this.fx('fx_sparkle', this.cx + Phaser.Math.Between(-60, 60), this.cy + Phaser.Math.Between(-10, 30));
      this.updateLabel();
      if (this.thwacks >= THWACKS) this.time.delayedCall(250, () => this.toMeasure());
    }
  }

  update(_t: number, delta: number): void {
    if (this.step !== 'wind' || !this.holding || this.finished) return;
    const before = this.wraps;
    this.wraps = Math.min(this.targetWraps, this.wraps + (Math.max(12, this.targetWraps / WIND_SECONDS) * delta) / 1000);
    if (Math.floor(this.wraps) !== Math.floor(before)) {
      if (this.time.now - this.lastWrapSfx > 140) {
        this.lastWrapSfx = this.time.now;
        playSfx('niddy_wrap');
      }
    }
    this.wraps = Math.min(this.targetWraps, this.wraps);
    const shown = Math.floor(this.wraps);
    this.drawNiddy(this.wraps / this.targetWraps);
    this.label.setText(`Wraps: ${shown} · ${shown * 2} yards`);
    if (this.wraps >= this.targetWraps) {
      this.holding = false;
      this.wraps = this.targetWraps;
      this.toTie();
    }
  }

  private buildSkein(): void {
    const { main, shade } = this.fiberColors();
    const g = this.add.graphics();
    g.lineStyle(14, hex('o')).strokeEllipse(0, 0, 170, 56);
    g.lineStyle(10, main).strokeEllipse(0, 0, 170, 56);
    g.lineStyle(1, shade);
    for (let i = -80; i < 80; i += 7) g.lineBetween(i, -28, i + 4, -22).lineBetween(i, 22, i + 4, 28);
    this.skein = this.add.container(this.cx, this.cy, [g]);
  }

  private toTie(): void {
    this.step = 'tie';
    this.niddy.clear();
    this.buildSkein();
    this.hint.set('Slip it off and tap the four glowing spots to tie figure-8 ties.');
    const spots = [
      [-60, -24],
      [60, -24],
      [-60, 24],
      [60, 24],
    ];
    for (const [dx, dy] of spots) {
      const s = this.add.circle(this.cx + dx, this.cy + dy, 7).setStrokeStyle(2, hex('y'));
      this.tweens.add({ targets: s, scale: 1.4, yoyo: true, repeat: -1, duration: 500 });
      this.tieSpots.push(s);
    }
    this.updateLabel();
  }

  private toSoak(): void {
    this.step = 'soak';
    this.hint.set('A warm soak with a little wool wash relaxes the fibers and sets the twist.');
    const basin = this.add.ellipse(this.cx, this.cy + 10, 220, 90, hex('b'), 0.85).setStrokeStyle(3, hex('o'));
    basin.setDepth(-0.5);
    playSfx('water_slosh');
    this.tweens.add({ targets: this.skein, y: this.cy + 10, alpha: 0.75, duration: 500 });
    this.updateLabel();
    this.time.addEvent({
      delay: 250,
      repeat: 9,
      callback: () => this.fx('fx_sparkle', this.cx + Phaser.Math.Between(-90, 90), this.cy + Phaser.Math.Between(-10, 30)),
    });
    this.time.delayedCall(2800, () => {
      basin.destroy();
      this.skein.setAlpha(1).setY(this.cy);
      this.step = 'thwack';
      this.hint.set('Squeeze it out, then thwack it! Tap the skein quickly to snap it against the counter.');
      this.updateLabel();
    });
  }

  private toMeasure(): void {
    this.step = 'measure';
    this.updateLabel();
    this.hint.set('Hung to dry. Measuring wraps per inch with the WPI tool…');
    const wpi = Math.round(this.item.wpi ?? 12);
    const tx = this.cx;
    const ty = this.cy + 70;
    const tool = this.add.graphics();
    tool.fillStyle(hex('o')).fillRect(tx - 30, ty - 6, 60, 22);
    tool.fillStyle(hex('L')).fillRect(tx - 28, ty - 4, 56, 18);
    tool.fillStyle(hex('W')).fillRect(tx - 14, ty - 4, 28, 18);
    const { main } = this.fiberColors();
    for (let i = 0; i < wpi; i++) {
      this.time.delayedCall(i * 70, () => {
        tool.fillStyle(main).fillRect(tx - 14 + (i * 28) / wpi, ty - 4, Math.max(1, 28 / wpi - 0.5), 18);
        if (i % 3 === 0) playSfx('ui_tap');
      });
    }
    this.time.delayedCall(wpi * 70 + 500, () => this.complete());
  }

  private complete(): void {
    this.step = 'done';
    const set = Math.min(1, this.thwacks / THWACKS);
    const y = finish(game.state, this.item, { set });
    game.changed();
    unlock('thwack');
    this.result(
      'A finished skein!',
      [
        ['Skein', yarnName(y)],
        ['Weight', `${y.grams} g · ${y.yards} yards`],
        ['WPI', `${y.wpi} (${weightForWpi(y.wpi).name})`],
        ['Evenness', `${y.evenness} of 100`],
        ...(y.plyBalance !== null ? ([['Ply balance', `${y.plyBalance} of 100${y.balanced ? ', balanced' : ''}`]] as [string, string][]) : []),
        ['Quality', `${y.grade} (${y.score})`],
      ],
      'It’s in your stash now, labeled and twisted into a skein. The Dye Studio and the Shop come next.',
    );
  }
}
