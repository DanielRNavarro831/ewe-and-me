import Phaser from 'phaser';
import { Minigame } from './Minigame';
import { game } from '../game';
import { skirt } from '../systems/workshop';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';
import { breed } from '../data/breeds';
import { el } from '../ui/modal';

type LockKind = 'good' | 'tag' | 'belly' | 'vm';

interface Lock {
  kind: LockKind;
  obj: Phaser.GameObjects.Container;
  removed: boolean;
}

const CELL = 16;
const COLS = 14;
const ROWS = 9;

/**
 * Skirting: the fleece is laid cut-side down on the slatted table. Pull away
 * tags, belly wool and VM-heavy bits; keep the good fleece. Over-skirting
 * wastes good wool, under-skirting leaves VM. Produces the skirting bonus (0–20).
 */
export class SkirtScene extends Minigame {
  private locks: Lock[] = [];
  private counter!: HTMLElement;

  constructor() {
    super('Skirt');
  }

  create(): void {
    this.locks = [];
    this.setup('Skirting');
    const { main, shade } = this.fiberColors();
    const ox = Math.round((this.W - COLS * CELL) / 2);
    const oy = Math.round(this.H * 0.47 - (ROWS * CELL) / 2);

    // slatted skirting table
    const table = this.add.graphics();
    table.fillStyle(hex('D')).fillRect(ox - 10, oy - 10, COLS * CELL + 20, ROWS * CELL + 20);
    for (let x = ox - 8; x < ox + COLS * CELL + 8; x += 6) table.fillStyle(hex('W')).fillRect(x, oy - 8, 4, ROWS * CELL + 16);

    // Seeded by item id so a fleece looks the same if you leave and come back.
    const rand = seededFrom(this.item.id);
    const vmSpots = Math.round(breed(this.item.breedId).baseVm + (this.item.parts?.vm ?? 4) / 2);
    const cx = (COLS - 1) / 2;
    const cy = (ROWS - 1) / 2;
    const interior: Lock[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const dx = (c - cx) / (COLS / 2);
        const dy = (r - cy) / (ROWS / 2);
        const d = Math.sqrt(dx * dx + dy * dy) + (rand() - 0.5) * 0.18;
        if (d > 1.02) continue;
        let kind: LockKind = 'good';
        if (d > 0.8 && rand() < 0.75) kind = r > cy + 1.5 ? 'belly' : 'tag';
        const x = ox + c * CELL;
        const y = oy + r * CELL;
        const lock = this.makeLock(kind, x, y, main, shade, rand);
        this.locks.push(lock);
        if (kind === 'good' && d < 0.75) interior.push(lock);
      }
    }
    // hay and burrs caught in the fleece
    for (let i = 0; i < vmSpots && interior.length; i++) {
      const lock = interior.splice(Math.floor(rand() * interior.length), 1)[0];
      lock.obj.destroy();
      const { x, y } = lock.obj;
      Object.assign(lock, this.makeLock('vm', x, y, main, shade, rand));
    }

    this.hint.set('Pull away tags, belly wool and hay-filled bits. Keep the good fleece.');
    const ctr = this.controls();
    this.counter = el('span', { textContent: 'Skirtings: 0 locks' });
    const done = el('button', { className: 'btn primary', textContent: 'Done skirting' });
    done.addEventListener('click', () => this.done());
    ctr.append(el('div', { className: 'row' }, [this.counter, done]));

    const pull = (p: Phaser.Input.Pointer) => {
      if (this.finished || !p.isDown) return;
      for (const l of this.locks) {
        if (l.removed) continue;
        const b = l.obj;
        if (p.worldX >= b.x && p.worldX < b.x + CELL && p.worldY >= b.y && p.worldY < b.y + CELL) this.remove(l);
      }
    };
    this.input.on('pointerdown', pull);
    this.input.on('pointermove', pull);
  }

  private makeLock(kind: LockKind, x: number, y: number, main: number, shade: number, rand: () => number): Lock {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const base = kind === 'tag' ? hex('L') : kind === 'belly' ? hex('l') : main;
    parts.push(this.add.rectangle(0, 0, CELL, CELL, base).setOrigin(0));
    // crimp lines
    for (let i = 0; i < 3; i++) {
      parts.push(this.add.rectangle(2 + Math.floor(rand() * 10), 3 + i * 4, 4, 1, kind === 'good' || kind === 'vm' ? shade : hex('g')).setOrigin(0));
    }
    if (kind === 'tag') {
      // dung tags: dark clumps
      parts.push(this.add.rectangle(4, 6, 5, 4, hex('W')).setOrigin(0), this.add.rectangle(9, 9, 3, 3, hex('D')).setOrigin(0));
    } else if (kind === 'belly') {
      // short, matted belly wool
      parts.push(this.add.rectangle(3, 5, 9, 2, hex('g')).setOrigin(0), this.add.rectangle(5, 10, 7, 2, hex('g')).setOrigin(0));
    } else if (kind === 'vm') {
      // hay and a burr
      parts.push(
        this.add.rectangle(2, 7, 10, 1, hex('y')).setOrigin(0),
        this.add.rectangle(5, 4, 1, 8, hex('L')).setOrigin(0),
        this.add.rectangle(10, 10, 3, 3, hex('W')).setOrigin(0),
      );
    }
    const obj = this.add.container(x, y, parts);
    return { kind, obj, removed: false };
  }

  private remove(l: Lock): void {
    l.removed = true;
    playSfx('card_brush');
    this.tweens.add({
      targets: l.obj,
      x: this.W - 30,
      y: this.H * 0.47 + (ROWS * CELL) / 2 + 30,
      scale: 0.4,
      alpha: 0,
      duration: 380,
      ease: 'Sine.easeIn',
    });
    const n = this.locks.filter((x) => x.removed).length;
    this.counter.textContent = `Skirtings: ${n} lock${n === 1 ? '' : 's'}`;
  }

  private done(): void {
    if (this.finished) return;
    const bad = this.locks.filter((l) => l.kind !== 'good');
    const good = this.locks.filter((l) => l.kind === 'good');
    const badRemoved = bad.length ? bad.filter((l) => l.removed).length / bad.length : 1;
    const goodRemoved = good.length ? good.filter((l) => l.removed).length / good.length : 0;
    // Tags, belly and VM bits are small, so they weigh less than a good lock.
    const weight = (l: Lock) => (l.kind === 'good' ? 1 : 0.4);
    const total = this.locks.reduce((a, l) => a + weight(l), 0);
    const kept = this.locks.filter((l) => !l.removed).reduce((a, l) => a + weight(l), 0) / total;
    const before = this.item.grams;
    const out = skirt(game.state, this.item, badRemoved, goodRemoved, kept);
    game.changed();
    playSfx('fleece_drop');
    const missedVm = this.locks.filter((l) => l.kind === 'vm' && !l.removed).length;
    const note =
      goodRemoved > 0.15
        ? 'A little over-skirted: some good wool went into the skirtings pile. It can go in the compost or the garden.'
        : badRemoved < 0.6
          ? `Some tags and VM are still in there${missedVm ? ` (${missedVm} hay-filled lock${missedVm > 1 ? 's' : ''})` : ''}. It'll scour out mostly fine.`
          : 'Nicely skirted: tags, belly wool and VM gone, good fleece kept.';
    this.result(
      'Skirted',
      [
        ['Skirting bonus', `+${out.skirtBonus} quality`],
        ['Kept', `${out.grams} g of ${before} g`],
        ['Fleece quality', `${out.score}`],
      ],
      note,
    );
  }
}

function seededFrom(id: string): () => number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
