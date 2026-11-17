import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import { spin, pliedWpi, type SpinSetup } from '../systems/workshop';
import { whorl } from '../data/yarnWeights';
import { weightForWpi } from '../data/yarnWeights';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';

const GOAL = 20; // seconds of drafting at normal speed to fill the bobbin
const TAU = 900; // wheel slows with this time constant (ms) between treadles
const SPEED_NORM = 1.45; // wheel speed from steady treadling at ~1.6 taps/s

/**
 * Spinning. Left thumb: tap the treadle in a steady rhythm. Right thumb: hold
 * in the drafting zone; how high you hold sets the thickness against the
 * target line. Twist comes from treadle speed relative to drafting speed:
 * too little and the yarn drifts apart (Madhu rejoins it, no loss); too much
 * and the singles kink. Singles are spun Z (clockwise).
 */
export class SpinScene extends Minigame {
  private setupOpts!: SpinSetup;
  private wheelSpeed = 0;
  private wheelAngle = 0;
  private taps: number[] = [];
  private length = 0;
  private samples: number[] = [];
  private targets: number[] = [];
  private devSum = 0;
  private devN = 0;
  private overMs = 0;
  private underMs = 0;
  private draftMs = 0;
  private underRun = 0;
  private pausedUntil = 0;
  private sampleAcc = 0;
  private lastTreadleSfx = 0;

  private wheel!: Phaser.GameObjects.Graphics;
  private strand!: Phaser.GameObjects.Graphics;
  private graph!: Phaser.GameObjects.Graphics;
  private draftZone!: Phaser.Geom.Rectangle;
  private treadle!: Phaser.GameObjects.Arc;
  private targetLine!: Phaser.GameObjects.Rectangle;
  private handle!: Phaser.GameObjects.Rectangle;
  private bobbin!: Phaser.GameObjects.Rectangle;
  private ui!: { twist: Phaser.GameObjects.Text; rhythm: Phaser.GameObjects.Text; progress: Phaser.GameObjects.Rectangle };

  constructor() {
    super('Spin');
  }

  init(data: { itemId: string; setup: SpinSetup }): void {
    super.init(data);
    this.setupOpts = data.setup;
    this.wheelSpeed = 0;
    this.wheelAngle = 0;
    this.taps = [];
    this.length = 0;
    this.samples = [];
    this.targets = [];
    this.devSum = 0;
    this.devN = 0;
    this.overMs = 0;
    this.underMs = 0;
    this.draftMs = 0;
    this.underRun = 0;
    this.pausedUntil = 0;
    this.sampleAcc = 0;
    this.meanThick = 0;
  }

  private get baseTarget(): number {
    return whorl(this.setupOpts.whorl).targetThickness;
  }

  private targetNow(): number {
    if (!this.setupOpts.art) return this.baseTarget;
    // art yarn: a deliberate thick-and-thin rhythm
    return Phaser.Math.Clamp(this.baseTarget + 0.28 * Math.sin(this.length * 1.4), 0.08, 0.95);
  }

  create(): void {
    this.setup('Spinning', 'wood');
    const { W, H } = this;
    const { main } = this.fiberColors();

    // wheel
    this.wheel = this.add.graphics();
    // flyer, bobbin and orifice
    const fx = 170;
    const fy = 96;
    this.add.rectangle(fx, fy, 56, 26, hex('o'));
    this.add.rectangle(fx, fy, 52, 22, hex('L'));
    this.bobbin = this.add.rectangle(fx - 22, fy, 2, 14, main).setOrigin(0, 0.5);
    this.add.rectangle(fx + 30, fy, 10, 4, hex('W'));
    this.strand = this.add.graphics();

    // thickness graph
    const gy = 190;
    this.add.rectangle(W / 2, gy + 40, W - 20, 84, hex('n')).setStrokeStyle(2, hex('o'));
    this.graph = this.add.graphics();

    // treadle pad
    const ty = H - 118;
    this.treadle = this.add.circle(68, ty, 44, hex('W')).setStrokeStyle(3, hex('o'));
    this.add.circle(68, ty, 30, hex('L'));
    this.add.text(68, ty, 'Treadle', { fontFamily: 'Pixelify Sans', fontSize: '11px', color: '#2B1E1E' }).setOrigin(0.5).setResolution(4);

    // drafting zone
    this.draftZone = new Phaser.Geom.Rectangle(178, H - 250, 70, 210);
    const z = this.draftZone;
    this.add.rectangle(z.centerX, z.centerY, z.width + 6, z.height + 6, hex('o'));
    this.add.rectangle(z.centerX, z.centerY, z.width, z.height, hex('l'));
    this.add.text(z.centerX, z.y + 8, 'fine', { fontFamily: 'Pixelify Sans', fontSize: '10px', color: '#4A3B3B' }).setOrigin(0.5, 0).setResolution(4);
    this.add.text(z.centerX, z.bottom - 8, 'bulky', { fontFamily: 'Pixelify Sans', fontSize: '10px', color: '#4A3B3B' }).setOrigin(0.5, 1).setResolution(4);
    this.targetLine = this.add.rectangle(z.centerX, 0, z.width, 3, hex('y'));
    this.handle = this.add.rectangle(z.centerX, 0, z.width - 10, 12, main).setStrokeStyle(2, hex('o')).setVisible(false);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, this.treadle.x, this.treadle.y) <= 52) this.tapTreadle();
    });

    const label = { fontFamily: 'Pixelify Sans', fontSize: '11px', color: '#F3EAE0' };
    this.add.rectangle(W / 2, 290, W - 20, 8, hex('o'));
    this.ui = {
      rhythm: this.add.text(12, 166, '', label).setResolution(4),
      twist: this.add.text(W - 12, 166, '', label).setOrigin(1, 0).setResolution(4),
      progress: this.add.rectangle(12, 290, 0, 4, hex('t')).setOrigin(0, 0.5),
    };
    this.add.rectangle(W / 2, 175, W - 16, 22, hex('o'), 0.7).setDepth(-1);

    const style = this.setupOpts.style === 'long' ? 'long draw' : 'short forward draw';
    this.hint.set(`Tap the treadle steadily with one thumb; hold the other on the drafting zone at the yellow line (${style}).`);
  }

  private tapTreadle(): void {
    const now = this.time.now;
    this.taps.push(now);
    if (this.taps.length > 8) this.taps.shift();
    this.wheelSpeed = Math.min(3, this.wheelSpeed + 1);
    this.tweens.add({ targets: this.treadle, scale: 0.92, yoyo: true, duration: 70 });
    if (now - this.lastTreadleSfx > 120) {
      this.lastTreadleSfx = now;
      playSfx('treadle_tap');
    }
  }

  /** 0..1, how steady the treadle rhythm is. */
  private rhythm(): number {
    if (this.taps.length < 3) return 0;
    const iv = this.taps.slice(1).map((t, i) => t - this.taps[i]);
    const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
    const sd = Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length);
    return Phaser.Math.Clamp(1 - sd / mean, 0, 1);
  }

  private drafting(): { active: boolean; thick: number } {
    for (const p of this.input.manager.pointers) {
      if (p.isDown && this.draftZone.contains(p.worldX, p.worldY)) {
        return { active: true, thick: (p.worldY - this.draftZone.y) / this.draftZone.height };
      }
    }
    return { active: false, thick: 0 };
  }

  update(_t: number, delta: number): void {
    if (this.finished) return;
    const now = this.time.now;
    this.wheelSpeed *= Math.exp(-delta / TAU);
    const speed = this.wheelSpeed / SPEED_NORM;
    this.wheelAngle += speed * delta * 0.006;
    this.drawWheel();

    const target = this.targetNow();
    const z = this.draftZone;
    this.targetLine.y = z.y + target * z.height;

    const d = this.drafting();
    this.handle.setVisible(d.active);
    if (d.active) this.handle.y = z.y + d.thick * z.height;

    const draftSpeed = this.setupOpts.style === 'long' ? 1.25 : 0.85;
    const twist = (speed * (whorl(this.setupOpts.whorl).ratio / 8)) / draftSpeed;
    const paused = now < this.pausedUntil;

    if (d.active && !paused && speed > 0.15) {
      this.draftMs += delta;
      this.length += (draftSpeed * delta) / 1000;
      if (twist < 0.55) {
        this.underMs += delta;
        this.underRun += delta;
        if (this.underRun > 700) this.driftApart();
      } else {
        this.underRun = 0;
      }
      if (twist > 1.6) this.overMs += delta;

      this.sampleAcc += delta;
      if (this.sampleAcc >= 60) {
        this.sampleAcc = 0;
        const jitter = (Math.random() - 0.5) * (this.setupOpts.style === 'long' ? 0.08 : 0.04);
        const thick = Phaser.Math.Clamp(d.thick + jitter + (twist > 1.6 ? 0.06 : 0), 0, 1);
        this.samples.push(thick);
        this.targets.push(target);
        if (this.samples.length > 110) {
          this.samples.shift();
          this.targets.shift();
        }
        this.devSum += Math.abs(thick - target);
        this.devN += 1;
        this.meanThick += (thick - this.meanThick) / this.devN;
      }
    }

    this.drawStrand(d.active && !paused, twist);
    this.drawGraph();
    this.bobbin.width = 2 + (this.length / GOAL) * 40;

    const state = !d.active || speed < 0.15 ? '—' : twist < 0.7 ? 'under-twisted' : twist > 1.35 ? 'over-twisted' : 'balanced';
    this.ui.twist.setText(`Twist: ${paused ? 'rejoining…' : state}`);
    const r = this.rhythm();
    this.ui.rhythm.setText(`Rhythm: ${this.taps.length < 3 ? '—' : r > 0.8 ? 'steady' : r > 0.55 ? 'a bit uneven' : 'uneven'}`);
    this.ui.progress.width = Math.min(1, this.length / GOAL) * (this.W - 24);

    if (this.length >= GOAL) this.done();
  }

  private meanThick = 0;

  private driftApart(): void {
    this.underRun = 0;
    this.pausedUntil = this.time.now + 1200;
    playSfx('felt_oops');
    this.hint.set('It drifted apart: too little twist. Madhu rejoins it. Treadle a little faster.');
    this.time.delayedCall(2600, () => {
      if (!this.finished) this.hint.set('Steady treadling, hand at the yellow line.');
    });
  }

  private drawWheel(): void {
    const g = this.wheel;
    const cx = 70;
    const cy = 110;
    const r = 48;
    g.clear();
    g.lineStyle(2, hex('W'));
    g.lineBetween(cx - 20, cy + 70, cx, cy).lineBetween(cx + 20, cy + 70, cx, cy);
    for (let i = 0; i < 8; i++) {
      const a = this.wheelAngle + (i / 8) * Math.PI * 2;
      g.lineStyle(2, hex('L')).lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.lineStyle(6, hex('o')).strokeCircle(cx, cy, r);
    g.lineStyle(4, hex('W')).strokeCircle(cx, cy, r);
    g.fillStyle(hex('D')).fillCircle(cx, cy, 5);
    // drive band to the whorl
    g.lineStyle(1, hex('w')).lineBetween(cx, cy - r, 148, 92).lineBetween(cx, cy + r, 148, 100);
  }

  private drawStrand(moving: boolean, twist: number): void {
    const g = this.strand;
    const { main, shade } = this.fiberColors();
    g.clear();
    const x0 = 200;
    const x1 = this.W - 6;
    const y = 96;
    const n = Math.min(this.samples.length, 30);
    for (let i = 0; i < n; i++) {
      const thick = this.samples[this.samples.length - 1 - i];
      const h = 1 + Math.round(thick * 6);
      const x = x0 + ((x1 - x0) * i) / 30;
      g.fillStyle(hex('o')).fillRect(x, y - h / 2 - 1, (x1 - x0) / 30 + 1, h + 2);
      g.fillStyle(main).fillRect(x, y - h / 2, (x1 - x0) / 30 + 1, h);
      // Z twist marks, denser with more twist
      if (moving && (i + Math.floor(this.length * 12)) % Math.max(1, Math.round(4 / Math.max(0.3, twist))) === 0) {
        g.fillStyle(shade).fillRect(x, y - h / 2, 1, h);
      }
    }
  }

  private drawGraph(): void {
    const g = this.graph;
    g.clear();
    const left = 14;
    const top = 196;
    const h = 72;
    const w = this.W - 28;
    const n = this.samples.length;
    const step = w / 110;
    for (let i = 0; i < n; i++) {
      const x = left + i * step;
      const t = this.targets[i];
      g.fillStyle(hex('y'), 0.5).fillRect(x, top + t * h - 1, step + 0.5, 2);
      const s = this.samples[i];
      const off = Math.abs(s - t) > 0.12;
      g.fillStyle(off ? hex('x') : hex('f')).fillRect(x, top + s * h - 2, step + 0.5, 4);
    }
  }

  private done(): void {
    this.finished = true;
    const art = this.setupOpts.art;
    const meanDev = this.devN ? this.devSum / this.devN : 0.3;
    const overSec = this.overMs / 1000;
    const evenness = Phaser.Math.Clamp(100 - meanDev * 220 - overSec * 4, 5, 100);
    const draft = Math.max(1, this.draftMs);
    const twist = this.overMs / draft > 0.3 ? 'over' : this.underMs / draft > 0.3 ? 'under' : 'balanced';
    const ratio = (this.meanThick || this.baseTarget) / this.baseTarget;
    const before = this.item.grams;
    const out = spin(game.state, this.item, this.setupOpts, { evenness, thicknessRatio: ratio, twist });
    game.changed();
    playSfx('fleece_drop');
    const wpi = out.wpi ?? 12;
    const left = before - out.grams;
    this.result(
      'A full bobbin',
      [
        ['Singles', `${out.grams} g, spun Z`],
        ['Grist', `${wpi} WPI singles (${weightForWpi(wpi).name})`],
        ['As a 2-ply', `about ${pliedWpi(wpi, 2)} WPI, ${weightForWpi(pliedWpi(wpi, 2)).name}`],
        ['Evenness', art ? 'Thick-and-thin, on purpose' : `${Math.round(evenness)} of 100`],
        ['Twist', twist === 'balanced' ? 'Balanced' : twist === 'over' ? 'Over-twisted (kinky)' : 'Under-twisted (soft)'],
        ['Preparation', out.prep === 'woolen' ? 'Woolen' : out.prep === 'worsted' ? 'Worsted' : 'Semi-worsted'],
      ],
      left >= 5 ? `${left} g of prepared fiber is still waiting at the wheel.` : 'All the prepared fiber is spun.',
    );
  }
}
