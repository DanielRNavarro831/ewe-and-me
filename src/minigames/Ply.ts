import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import type { FiberItem } from '../systems/state';
import { ply } from '../systems/workshop';
import { weightForWpi } from '../data/yarnWeights';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';

const DURATION = 15000;
const TAU = 900;
const SPEED_NORM = 1.45;
const BAND = 0.36;
const WARMUP = 1500; // the first moments of getting the wheel going don't count

/**
 * Plying: the singles come off the lazy kate (or one bobbin is chain-plied) and
 * the wheel turns the other way (S). Treadle so the ply twist matches the
 * singles twist: the balance meter stays centered, and a sample loop hangs
 * straight instead of twisting back on itself.
 */
export class PlyScene extends Minigame {
  private bobbins: FiberItem[] = [];
  private chain = false;
  private wheelSpeed = 0;
  private wheelAngle = 0;
  private elapsed = 0;
  private inBand = 0;
  private started = false;
  private lastSfx = 0;
  private ideal = 1;
  private needle!: Phaser.GameObjects.Rectangle;
  private loop!: Phaser.GameObjects.Graphics;
  private wheel!: Phaser.GameObjects.Graphics;
  private progress!: Phaser.GameObjects.Rectangle;
  private treadle!: Phaser.GameObjects.Arc;
  private meterX = 0;
  private meterW = 0;
  private balanceNow = 0;

  constructor() {
    super('Ply');
  }

  init(data: { itemId: string; itemIds: string[]; chain: boolean }): void {
    super.init(data);
    this.bobbins = data.itemIds.map((id) => game.state.fiber.find((f) => f.id === id)!).filter(Boolean);
    this.chain = data.chain;
    this.wheelSpeed = 0;
    this.wheelAngle = 0;
    this.elapsed = 0;
    this.inBand = 0;
    this.started = false;
    // Singles with more twist need more ply twist to balance.
    const twists = this.bobbins.map((b) => (b.twist === 'over' ? 1.25 : b.twist === 'under' ? 0.8 : 1));
    this.ideal = twists.reduce((a, b) => a + b, 0) / twists.length;
  }

  create(): void {
    this.setup(this.chain ? 'Chain plying' : 'Plying', 'wood');
    const { W, H } = this;
    const { main, shade } = this.fiberColors();

    this.wheel = this.add.graphics();

    // lazy kate with bobbins of singles
    const kx = 40;
    const ky = 250;
    this.add.rectangle(kx + 20, ky + 34, 74, 10, hex('o'));
    this.add.rectangle(kx + 20, ky + 34, 70, 6, hex('W'));
    const n = this.chain ? 1 : this.bobbins.length;
    for (let i = 0; i < n; i++) {
      const x = kx + i * 22;
      this.add.rectangle(x, ky + 10, 16, 44, hex('o'));
      this.add.rectangle(x, ky + 10, 12, 40, main);
      this.add.rectangle(x, ky + 10, 12, 2, shade);
      this.add.line(0, 0, x, ky - 12, 150, 100, main).setOrigin(0).setLineWidth(1);
    }

    // balance meter
    this.meterW = W - 40;
    this.meterX = 20;
    const my = 330;
    this.add.rectangle(W / 2, my, this.meterW + 6, 22, hex('o'));
    this.add.rectangle(W / 2, my, this.meterW, 16, hex('l'));
    this.add.rectangle(W / 2, my, this.meterW * BAND, 16, hex('H'));
    const label = { fontFamily: 'Pixelify Sans', fontSize: '10px', color: '#F3EAE0' };
    this.add.text(this.meterX, my + 14, 'under-plied', label).setResolution(4);
    this.add.text(this.meterX + this.meterW, my + 14, 'over-plied', label).setOrigin(1, 0).setResolution(4);
    this.add.text(W / 2, my + 14, 'balanced', label).setOrigin(0.5, 0).setResolution(4);
    this.needle = this.add.rectangle(W / 2, my, 4, 26, hex('o'));

    // hanging sample loop
    this.loop = this.add.graphics();

    this.progress = this.add.rectangle(20, my - 24, 0, 4, hex('t')).setOrigin(0, 0.5);

    const ty = H - 100;
    this.treadle = this.add.circle(W / 2, ty, 46, hex('W')).setStrokeStyle(3, hex('o'));
    this.add.circle(W / 2, ty, 32, hex('L'));
    this.add.text(W / 2, ty, 'Treadle', { fontFamily: 'Pixelify Sans', fontSize: '11px', color: '#2B1E1E' }).setOrigin(0.5).setResolution(4);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, this.treadle.x, this.treadle.y) <= 54) this.tap();
    });

    this.hint.set(
      this.chain
        ? 'Chain plying keeps color sequences intact. Treadle steadily (the wheel turns S now) to keep the needle in the green.'
        : 'The wheel turns the other way (S) to ply. Treadle steadily to keep the needle in the green.',
    );
  }

  private tap(): void {
    this.started = true;
    this.wheelSpeed = Math.min(3, this.wheelSpeed + 1);
    this.tweens.add({ targets: this.treadle, scale: 0.92, yoyo: true, duration: 70 });
    if (this.time.now - this.lastSfx > 120) {
      this.lastSfx = this.time.now;
      playSfx('ply_twist');
    }
  }

  update(_t: number, delta: number): void {
    if (this.finished) return;
    this.wheelSpeed *= Math.exp(-delta / TAU);
    const speed = this.wheelSpeed / SPEED_NORM;
    this.wheelAngle -= speed * delta * 0.006; // S: counter-clockwise
    this.drawWheel();

    // −1 (under-plied) … 0 (balanced) … +1 (over-plied)
    const bal = Phaser.Math.Clamp((speed - this.ideal) / this.ideal, -1, 1);
    this.balanceNow = Phaser.Math.Linear(this.balanceNow, bal, 0.05);
    this.needle.x = this.meterX + this.meterW / 2 + (this.balanceNow * this.meterW) / 2;
    this.drawLoop(this.balanceNow);

    if (this.started) {
      this.elapsed += delta;
      if (this.elapsed > WARMUP && Math.abs(this.balanceNow) <= BAND / 2 + 0.02) this.inBand += delta;
      this.progress.width = Math.min(1, this.elapsed / DURATION) * (this.W - 40);
      if (this.elapsed >= DURATION) this.done();
    }
  }

  private drawWheel(): void {
    const g = this.wheel;
    const cx = 80;
    const cy = 120;
    const r = 50;
    g.clear();
    for (let i = 0; i < 8; i++) {
      const a = this.wheelAngle + (i / 8) * Math.PI * 2;
      g.lineStyle(2, hex('L')).lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.lineStyle(6, hex('o')).strokeCircle(cx, cy, r);
    g.lineStyle(4, hex('W')).strokeCircle(cx, cy, r);
    g.fillStyle(hex('D')).fillCircle(cx, cy, 5);
    g.fillStyle(hex('o')).fillRect(140, 88, 58, 26);
    g.fillStyle(hex('L')).fillRect(142, 90, 54, 22);
  }

  /** A loop of yarn let hang: balanced yarn hangs open; unbalanced yarn twists on itself. */
  private drawLoop(bal: number): void {
    const g = this.loop;
    const { main } = this.fiberColors();
    g.clear();
    const x = this.W - 50;
    const top = 190;
    const twists = Math.round(Math.abs(bal) * 5);
    const len = 90 - twists * 8;
    g.lineStyle(4, hex('o'));
    g.lineBetween(x - 12, top, x - 12 + bal * 10, top + len).lineBetween(x + 12, top, x + 12 - bal * 10, top + len);
    g.lineStyle(2, main);
    g.lineBetween(x - 12, top, x - 12 + bal * 10, top + len).lineBetween(x + 12, top, x + 12 - bal * 10, top + len);
    g.lineStyle(2, hex('o'));
    for (let i = 0; i < twists; i++) {
      const y = top + len + i * 6;
      g.strokeEllipse(x, y + 4, 10, 6);
    }
    g.fillStyle(hex('D')).fillRect(x - 18, top - 4, 36, 4);
  }

  private done(): void {
    this.finished = true;
    const balance = Math.round(Math.min(1, this.inBand / (DURATION - WARMUP)) * 100);
    const out = ply(game.state, this.bobbins, this.chain, balance);
    game.changed();
    playSfx('fleece_drop');
    const wpi = out.wpi ?? 12;
    this.result(
      'Plied',
      [
        ['Yarn', `${out.grams} g, ${this.chain ? 'chain-plied (3-ply)' : `${out.plies}-ply`}, plied S`],
        ['Grist', `about ${wpi} WPI (${weightForWpi(wpi).name})`],
        ['Ply balance', `${balance} of 100${balance >= 70 ? ', hangs straight' : ', a little twisty'}`],
      ],
      'Next: wind it onto the niddy-noddy, set the twist and thwack it.',
    );
  }
}
