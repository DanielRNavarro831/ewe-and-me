import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import { cardIntoRolags } from '../systems/workshop';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';
import { el } from '../ui/modal';

const CHARGES = 3;
const FIBERS = 46;

/**
 * Hand carding: load the card, brush across it with the other card until the
 * fibers line up, then roll the batt off into a rolag for woolen spinning.
 * Three charges make a basket of rolags.
 */
export class CardScene extends Minigame {
  private align = 0;
  private strokes = 0;
  private charge = 0;
  private qualities: number[] = [];
  private fibers!: Phaser.GameObjects.Graphics;
  private topCard!: Phaser.GameObjects.Container;
  private seeds: { x: number; y: number; a: number; len: number; nep: boolean }[] = [];
  private start: { x: number; y: number } | null = null;
  private rollBtn!: HTMLButtonElement;
  private status!: HTMLElement;
  private card = { x: 0, y: 0, w: 200, h: 96 };
  private rolags: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Card');
  }

  create(): void {
    this.charge = 0;
    this.qualities = [];
    this.rolags = [];
    this.setup('Hand carding');
    const { W, H } = this;
    this.card = { x: Math.round(W / 2 - 100), y: Math.round(H * 0.42 - 48), w: 200, h: 96 };
    const c = this.card;

    // bottom card: wooden back, handle and card cloth with little teeth
    const g = this.add.graphics();
    g.fillStyle(hex('o')).fillRect(c.x - 4, c.y - 4, c.w + 8, c.h + 8);
    g.fillStyle(hex('L')).fillRect(c.x - 2, c.y - 2, c.w + 4, c.h + 4);
    g.fillStyle(hex('o')).fillRect(c.x + c.w / 2 - 12, c.y + c.h + 2, 24, 36);
    g.fillStyle(hex('W')).fillRect(c.x + c.w / 2 - 10, c.y + c.h + 2, 20, 34);
    g.fillStyle(hex('n')).fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    g.fillStyle(hex('g'));
    for (let y = c.y + 6; y < c.y + c.h - 6; y += 4) for (let x = c.x + 6; x < c.x + c.w - 6; x += 4) g.fillRect(x, y, 1, 1);

    this.fibers = this.add.graphics().setDepth(5);

    // the top card that sweeps across while brushing
    const tc = this.add.graphics();
    tc.fillStyle(hex('o')).fillRect(-4, -4, c.w + 8, 30);
    tc.fillStyle(hex('L')).fillRect(-2, -2, c.w + 4, 26);
    tc.fillStyle(hex('W')).fillRect(c.w / 2 - 10, -24, 20, 22);
    this.topCard = this.add.container(c.x, c.y - 40, [tc]).setDepth(10).setAlpha(0.95);

    const ui = this.controls();
    this.status = el('span', {});
    this.rollBtn = el('button', { className: 'btn primary', textContent: 'Roll off a rolag' });
    this.rollBtn.addEventListener('click', () => this.roll());
    ui.append(el('div', { className: 'row' }, [this.status, this.rollBtn]));

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.start = { x: p.worldX, y: p.worldY }));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.start) return;
      this.topCard.x = Phaser.Math.Clamp(p.worldX - c.w / 2, c.x - 60, c.x + 60);
      this.topCard.y = Phaser.Math.Clamp(p.worldY - 10, c.y - 40, c.y + c.h - 30);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.start) return;
      const dx = Math.abs(p.worldX - this.start.x);
      const dy = Math.abs(p.worldY - this.start.y);
      this.start = null;
      this.tweens.add({ targets: this.topCard, x: c.x, y: c.y - 40, duration: 200 });
      if (dx + dy > 70) this.stroke();
    });

    this.loadCharge();
  }

  /** Lays a fresh, tangled charge of clean wool on the card. */
  private loadCharge(): void {
    this.align = 0;
    this.strokes = 0;
    const c = this.card;
    this.seeds = [];
    for (let i = 0; i < FIBERS; i++) {
      this.seeds.push({
        x: c.x + 20 + Math.random() * (c.w - 40),
        y: c.y + 14 + Math.random() * (c.h - 28),
        a: Math.random() * Math.PI,
        len: 14 + Math.random() * 14,
        nep: Math.random() < 0.3,
      });
    }
    this.drawFibers();
    this.hint.set(`Charge ${this.charge + 1} of ${CHARGES}: brush across the card with long strokes until the fibers line up.`);
    this.updateStatus();
  }

  private stroke(): void {
    if (this.finished) return;
    this.strokes += 1;
    this.align = 1 - (1 - this.align) * 0.74;
    for (const s of this.seeds) if (s.nep && Math.random() < 0.35) s.nep = false;
    playSfx('card_brush');
    this.drawFibers();
    this.updateStatus();
  }

  private drawFibers(): void {
    const { main, shade } = this.fiberColors();
    const g = this.fibers;
    g.clear();
    for (const s of this.seeds) {
      // aligned fibers lie along the card (downwards); tangled ones point anywhere
      const target = Math.PI / 2;
      const a = target + (s.a - target) * (1 - this.align);
      const dx = (Math.cos(a) * s.len) / 2;
      const dy = (Math.sin(a) * s.len) / 2;
      g.lineStyle(3, shade).lineBetween(s.x - dx, s.y - dy + 1, s.x + dx, s.y + dy + 1);
      g.lineStyle(2, main).lineBetween(s.x - dx, s.y - dy, s.x + dx, s.y + dy);
      if (s.nep) g.fillStyle(shade).fillCircle(s.x, s.y, 2);
    }
  }

  private updateStatus(): void {
    const pct = Math.round(this.align * 100);
    this.status.textContent = `Strokes: ${this.strokes} · Fibers aligned: ${pct}%`;
    this.rollBtn.disabled = this.strokes < 3;
  }

  private roll(): void {
    if (this.finished || this.strokes < 3) return;
    this.qualities.push(this.align);
    playSfx('fleece_drop');
    // a soft rolag rolls off and joins the basket
    const { main } = this.fiberColors();
    const r = this.add.ellipse(this.card.x + this.card.w / 2, this.card.y + this.card.h / 2, this.card.w - 40, 22, main).setStrokeStyle(2, hex('o'));
    r.setDepth(20);
    const slot = this.rolags.length;
    this.rolags.push(r);
    this.tweens.add({
      targets: r,
      x: 40 + slot * 26,
      y: this.card.y - 64,
      scaleX: 0.22,
      scaleY: 0.9,
      duration: 500,
      ease: 'Sine.easeInOut',
    });
    this.charge += 1;
    if (this.charge >= CHARGES) {
      this.fibers.clear();
      this.time.delayedCall(550, () => this.done());
    } else {
      this.time.delayedCall(450, () => this.loadCharge());
    }
  }

  private done(): void {
    const q = this.qualities.reduce((a, b) => a + b, 0) / this.qualities.length;
    const before = this.item.grams;
    const out = cardIntoRolags(game.state, this.item, q);
    game.changed();
    this.result(
      'A basket of rolags',
      [
        ['Rolags', `${out.grams} g, ready for woolen spinning`],
        ['From', `${before} g clean wool`],
        ['Carding', q > 0.8 ? 'Airy and even' : q > 0.55 ? 'Nicely carded' : 'A bit lumpy (a few neps)'],
        ['Fiber quality', `${out.score}`],
      ],
      'Rolags spun with a long draw make lofty, warm, airy woolen yarn.',
    );
  }
}
