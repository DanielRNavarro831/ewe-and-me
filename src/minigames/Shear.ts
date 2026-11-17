import Phaser from 'phaser';
import { game } from '../game';
import type { Animal, Fleece } from '../systems/state';
import { breed, naturalColor } from '../data/breeds';
import { shearFleece } from '../systems/quality';
import { tickAnimal } from '../systems/ranch';
import { playSfx } from '../systems/audio';
import { hex } from '../art/palette';
import { showHint, toast, openModal, el, type HintBar } from '../ui/modal';
import { setTitleOverride } from '../ui/hud';

/**
 * Shearing: drag a finger along each highlighted blow, belly first, from tail
 * to neck. Long smooth blows take the fleece off in one piece. Going back over
 * shorn skin makes second cuts (short snippets), which lower quality a little.
 * It never fails, and lifting a finger mid-blow is fine.
 */

interface Blow {
  pts: { x: number; y: number; t: number }[];
  progress: number;
}

interface Cell {
  obj: Phaser.GameObjects.Rectangle;
  blow: number;
  t: number;
  gone: boolean;
  gx: number;
  gy: number;
}

const CELL = 6;
const BLOWS = 6;
const REACH = 24; // how close the finger must be to the blow line
const MAX_JUMP = 0.16; // can't skip far ahead along a blow

export class ShearScene extends Phaser.Scene {
  private animal!: Animal;
  private blows: Blow[] = [];
  private cells: Cell[] = [];
  private cellAt = new Map<string, Cell>();
  private current = 0;
  private guide!: Phaser.GameObjects.Graphics;
  private marker!: Phaser.GameObjects.Arc;
  private hint!: HintBar;
  private secondCuts = 0;
  private recutDist = 0;
  private last: { x: number; y: number } | null = null;
  private lastSnipT = 0;
  private done = false;
  private cx = 0;
  private cy = 0;
  private rx = 0;
  private ry = 0;

  constructor() {
    super('Shear');
  }

  init(data: { animalId: string }): void {
    const a = game.state.animals.find((x) => x.id === data.animalId);
    if (!a) throw new Error('No such animal');
    this.animal = a;
    tickAnimal(a, game.state);
    this.blows = [];
    this.cells = [];
    this.cellAt = new Map();
    this.current = 0;
    this.secondCuts = 0;
    this.recutDist = 0;
    this.last = null;
    this.done = false;
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const b = breed(this.animal.breedId);
    const color = naturalColor(b, this.animal.colorId);
    const fleeceA = parseInt(color.hex.slice(1), 16);
    const fleeceB = parseInt(color.shade.slice(1), 16);

    // shearing board
    this.add.tileSprite(0, 0, W, H, 'tile_wood_floor').setOrigin(0);
    this.add.rectangle(W / 2, H * 0.44, W - 16, H * 0.5, hex('L')).setStrokeStyle(2, hex('o'));

    this.cx = Math.round(W / 2 - 14);
    this.cy = Math.round(H * 0.44);
    const size = 0.85 + 0.15 * this.animal.growth;
    this.rx = Math.round(98 * size);
    this.ry = Math.round(60 * size);
    const { cx, cy, rx, ry } = this;

    // legs, outline and skin underneath the fleece
    const body = this.add.graphics();
    for (const lx of [cx - rx * 0.55, cx - rx * 0.3, cx + rx * 0.3, cx + rx * 0.55]) {
      body.fillStyle(hex('o')).fillRect(lx - 7, cy + ry * 0.55, 14, ry * 0.75 + 4);
      body.fillStyle(hex('l')).fillRect(lx - 5, cy + ry * 0.55, 10, ry * 0.75);
      body.fillStyle(hex('m')).fillRect(lx - 5, cy + ry * 1.2, 10, 6);
    }
    body.fillStyle(hex('o')).fillEllipse(cx, cy, rx * 2 + 6, ry * 2 + 6);
    body.fillStyle(hex('p')).fillEllipse(cx, cy, rx * 2, ry * 2);
    body.fillStyle(hex('P')).fillEllipse(cx, cy + ry * 0.35, rx * 1.7, ry * 0.9);

    // blows: belly first, working up to the back
    for (let i = 0; i < BLOWS; i++) {
      const rel = 0.68 - (i * 1.36) / (BLOWS - 1);
      const y = cy + rel * ry;
      const half = rx * Math.sqrt(1 - rel * rel) * 0.9;
      const pts = [];
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        pts.push({ x: cx - half + 2 * half * t, y: y + Math.sin(Math.PI * t) * 4, t });
      }
      this.blows.push({ pts, progress: 0 });
    }

    // fleece cells
    for (let gy = Math.floor((cy - ry) / CELL); gy * CELL <= cy + ry; gy++) {
      for (let gx = Math.floor((cx - rx) / CELL); gx * CELL <= cx + rx; gx++) {
        const x = gx * CELL + CELL / 2;
        const y = gy * CELL + CELL / 2;
        const dx = (x - cx) / (rx - 1);
        const dy = (y - cy) / (ry - 1);
        if (dx * dx + dy * dy > 1) continue;
        // nearest blow by height
        let blow = 0;
        let best = Infinity;
        this.blows.forEach((bl, i) => {
          const d = Math.abs(bl.pts[20].y - y);
          if (d < best) {
            best = d;
            blow = i;
          }
        });
        const pts = this.blows[blow].pts;
        const t = Phaser.Math.Clamp((x - pts[0].x) / (pts[pts.length - 1].x - pts[0].x), 0, 1);
        // soft, scattered shading (a cheap hash, so it looks the same every time)
        const n = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
        const shade = n - Math.floor(n) < 0.12 || y > cy + ry * 0.5;
        const obj = this.add.rectangle(gx * CELL, gy * CELL, CELL, CELL, shade ? fleeceB : fleeceA).setOrigin(0);
        const cell: Cell = { obj, blow, t, gone: false, gx, gy };
        this.cells.push(cell);
        this.cellAt.set(`${gx},${gy}`, cell);
      }
    }
    // soft crimp texture
    const crimp = this.add.graphics();
    crimp.fillStyle(fleeceB, 1);
    for (const c of this.cells) if ((c.gx + c.gy * 3) % 4 === 0) crimp.fillRect(c.gx * CELL + 1, c.gy * CELL + 2, 3, 1);
    this.crimp = crimp;

    this.drawHead(cx + rx - 4, cy - ry * 0.55, fleeceA);

    this.guide = this.add.graphics().setDepth(50);
    this.marker = this.add.circle(0, 0, 9).setStrokeStyle(2, hex('y')).setDepth(51);
    this.tweens.add({ targets: this.marker, scale: 1.35, alpha: 0.5, yoyo: true, repeat: -1, duration: 600 });
    this.drawGuide();

    this.hint = showHint('', { label: 'Later', onClick: () => this.leave() });
    this.updateHint();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDrag(p, true));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.onDrag(p, false));
    this.input.on('pointerup', () => (this.last = null));
    setTitleOverride(`Shearing ${this.animal.name ?? ''}`.trim());
    this.events.once('shutdown', () => {
      this.hint.close();
      setTitleOverride(null);
    });
  }

  private crimp!: Phaser.GameObjects.Graphics;

  private drawHead(x: number, y: number, fleece: number): void {
    const g = this.add.graphics().setDepth(40);
    // ear
    g.fillStyle(hex('o')).fillEllipse(x - 16, y - 6, 22, 14);
    g.fillStyle(hex('l')).fillEllipse(x - 16, y - 6, 18, 10);
    g.fillStyle(hex('x')).fillEllipse(x - 15, y - 6, 9, 5);
    // face
    g.fillStyle(hex('o')).fillCircle(x, y, 23);
    g.fillStyle(hex('l')).fillCircle(x, y, 20);
    g.fillStyle(hex('l')).fillEllipse(x + 12, y + 8, 24, 18);
    // topknot of fleece
    g.fillStyle(fleece).fillCircle(x - 6, y - 17, 7).fillCircle(x + 3, y - 19, 7);
    // eye with a sparkle, closed-happy when nearly done
    g.fillStyle(hex('o')).fillRect(x + 2, y - 6, 6, 7);
    g.fillStyle(hex('w')).fillRect(x + 2, y - 6, 2, 2);
    g.fillStyle(hex('x')).fillEllipse(x - 3, y + 6, 8, 5);
    g.fillStyle(hex('m')).fillRect(x + 19, y + 5, 3, 3);
  }

  private updateHint(): void {
    const name = this.animal.name ?? 'her';
    if (this.current === 0 && this.blows[0].progress === 0) {
      this.hint.set(`Shear ${name}: drag along the dotted line, from the tail to the neck.`);
    } else {
      this.hint.set(`Blow ${Math.min(this.current + 1, BLOWS)} of ${BLOWS}. Long, smooth strokes.`);
    }
  }

  private drawGuide(): void {
    const g = this.guide;
    g.clear();
    const blow = this.blows[this.current];
    if (!blow) {
      this.marker.setVisible(false);
      return;
    }
    for (const p of blow.pts) {
      if (p.t < blow.progress) continue;
      if (Math.round(p.t * 40) % 2 === 0) {
        g.fillStyle(hex('o')).fillRect(p.x - 2, p.y - 2, 4, 4);
        g.fillStyle(hex('y')).fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    }
    // arrowhead at the neck end
    const end = blow.pts[blow.pts.length - 1];
    g.fillStyle(hex('y')).fillTriangle(end.x + 6, end.y, end.x - 1, end.y - 5, end.x - 1, end.y + 5);
    const at = this.pointAt(blow, blow.progress);
    this.marker.setPosition(at.x, at.y).setVisible(true);
  }

  private pointAt(blow: Blow, t: number): { x: number; y: number } {
    const i = Math.min(blow.pts.length - 1, Math.round(t * (blow.pts.length - 1)));
    return blow.pts[i];
  }

  private onDrag(p: Phaser.Input.Pointer, first: boolean): void {
    if (this.done) return;
    const x = p.worldX;
    const y = p.worldY;
    const moved = this.last && !first ? Phaser.Math.Distance.Between(this.last.x, this.last.y, x, y) : 0;
    this.last = { x, y };

    const blow = this.blows[this.current];
    // nearest point on the current blow
    let best = Infinity;
    let bestT = -1;
    for (const pt of blow.pts) {
      const d = Phaser.Math.Distance.Between(x, y, pt.x, pt.y);
      if (d < best) {
        best = d;
        bestT = pt.t;
      }
    }

    if (best <= REACH && bestT > blow.progress && bestT <= blow.progress + MAX_JUMP) {
      blow.progress = bestT;
      this.clearUpTo(this.current, bestT);
      if (blow.progress - this.lastSnipT > 0.07) {
        this.lastSnipT = blow.progress;
        playSfx('shear_snip');
      }
      if (blow.progress >= 0.975) this.finishBlow();
      this.drawGuide();
      return;
    }

    // Going back over shorn skin makes second cuts.
    if (moved > 0 && this.isShorn(x, y) && !(best <= REACH && bestT >= blow.progress - 0.05)) {
      this.recutDist += moved;
      if (this.recutDist >= 26) {
        this.recutDist = 0;
        this.secondCuts += 1;
        playSfx('shear_snip');
        const fx = this.add.image(x, y - 6, 'fx_snip').setDepth(60);
        this.tweens.add({ targets: fx, y: y - 18, alpha: 0, duration: 700, onComplete: () => fx.destroy() });
      }
    }
  }

  private isShorn(x: number, y: number): boolean {
    const c = this.cellAt.get(`${Math.floor(x / CELL)},${Math.floor(y / CELL)}`);
    return !!c && c.gone;
  }

  private clearUpTo(blowIndex: number, t: number): void {
    for (const c of this.cells) {
      if (c.gone || c.blow !== blowIndex || c.t > t) continue;
      c.gone = true;
      // the fleece peels back and folds away rather than falling in bits
      this.tweens.add({ targets: c.obj, y: c.obj.y - 3, alpha: 0, duration: 260, ease: 'Sine.easeOut' });
    }
    this.redrawCrimp();
  }

  private redrawCrimp(): void {
    this.crimp.clear();
    const b = breed(this.animal.breedId);
    const shade = parseInt(naturalColor(b, this.animal.colorId).shade.slice(1), 16);
    this.crimp.fillStyle(shade, 1);
    for (const c of this.cells) {
      if (!c.gone && (c.gx + c.gy * 3) % 4 === 0) this.crimp.fillRect(c.gx * CELL + 1, c.gy * CELL + 2, 3, 1);
    }
  }

  private finishBlow(): void {
    this.clearUpTo(this.current, 1);
    this.blows[this.current].progress = 1;
    this.current += 1;
    this.lastSnipT = 0;
    this.last = null;
    if (this.current >= BLOWS) {
      this.finish();
      return;
    }
    this.updateHint();
  }

  private finish(): void {
    this.done = true;
    this.guide.clear();
    this.marker.setVisible(false);
    for (const c of this.cells) if (!c.gone) this.tweens.add({ targets: c.obj, alpha: 0, duration: 200 });
    this.crimp.clear();

    // The whole fleece lifts off and is laid aside, cut side down.
    const b = breed(this.animal.breedId);
    const color = naturalColor(b, this.animal.colorId);
    const fleece = this.add.graphics().setDepth(70);
    fleece.fillStyle(hex('o')).fillEllipse(0, 0, this.rx * 1.9 + 6, this.ry * 1.5 + 6);
    fleece.fillStyle(parseInt(color.hex.slice(1), 16)).fillEllipse(0, 0, this.rx * 1.9, this.ry * 1.5);
    fleece.fillStyle(parseInt(color.shade.slice(1), 16));
    for (let i = 0; i < 18; i++) fleece.fillRect(Phaser.Math.Between(-80, 70), Phaser.Math.Between(-35, 30), 4, 2);
    fleece.setPosition(this.cx, this.cy);
    playSfx('fleece_drop');
    this.tweens.add({
      targets: fleece,
      x: this.cx - 10,
      y: this.cy - this.ry - 30,
      scale: 0.55,
      angle: -8,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => this.showResult(),
    });
    this.hint.set(this.secondCuts === 0 ? 'Off in one piece!' : 'All done!');
  }

  private showResult(): void {
    const first = game.state.stats.shorn === 0;
    const a = this.animal;
    const f: Fleece = shearFleece(game.state, a, this.secondCuts);
    void game.saveNow();
    if (first) {
      playSfx('achievement_chime');
      toast('Achievement: First Fleece');
    }
    const b = breed(f.breedId);
    openModal(`${a.name ?? 'Her'} is shorn`, (body, close) => {
      body.append(
        el('p', {
          className: 'stat',
          textContent:
            f.secondCuts === 0
              ? 'Off in one piece, with no second cuts. Beautifully done.'
              : `Off with ${f.secondCuts} second cut${f.secondCuts > 1 ? 's' : ''}. Those short snippets will pill, so they cost a little quality.`,
        }),
        el('dl', { className: 'info' }, [
          el('dt', { textContent: 'Fleece' }),
          el('dd', { textContent: `${naturalColor(b, f.colorId).name} ${b.name}` }),
          el('dt', { textContent: 'Raw weight' }),
          el('dd', { textContent: `${f.rawGrams} g (about ${Math.round(f.rawGrams * b.scouredYield)} g once scoured)` }),
          el('dt', { textContent: 'Staple' }),
          el('dd', { textContent: `${f.stapleCm} cm` }),
          el('dt', { textContent: 'Quality' }),
          el('dd', { textContent: `${f.grade} (${f.score})` }),
        ]),
        el('p', {
          className: 'hint',
          textContent:
            `40 base + ${f.parts.happiness} happiness + ${f.parts.feed} feed + ${f.parts.growth} growth − ${f.parts.vm} VM` +
            (f.parts.secondCuts ? ` − ${f.parts.secondCuts} second cuts` : '') +
            '. Skirting in the Workshop can add up to 20 more.',
        }),
      );
      const back = el('button', { className: 'btn primary', textContent: 'Back to the ranch' });
      back.addEventListener('click', () => {
        close();
        this.leave();
      });
      body.append(el('div', { className: 'btn-row' }, [back]));
    });
  }

  private leave(): void {
    this.scene.start('Ranch');
  }
}
