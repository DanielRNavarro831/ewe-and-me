import Phaser from 'phaser';
import { RoomScene } from './Room';
import { game } from '../game';
import type { Animal } from '../systems/state';
import { breed } from '../data/breeds';
import { CARE, dayKey, fillHay, fleeceStage, hayInTrough, tickAll } from '../systems/ranch';
import { playSfx } from '../systems/audio';
import { openAnimalCard, openNamePrompt } from '../ui/ranchUi';
import { showHint, toast, type HintBar } from '../ui/modal';

interface SheepView {
  animal: Animal;
  sprite: Phaser.GameObjects.Sprite;
  stage: number;
  target: Phaser.Math.Vector2 | null;
  restUntil: number;
}

const SHEEP_SPEED = 9; // px per second: an unhurried amble
const BRUSH_GOAL = 320; // px of brushing strokes

/** The pasture: sheep grow fleece, wander and graze; Madhu pets, brushes, feeds and shears. */
export class RanchScene extends RoomScene {
  private sheep: SheepView[] = [];
  private trough!: Phaser.GameObjects.Image;
  private brushing: { view: SheepView; dist: number; nextFx: number; hint: HintBar; last: { x: number; y: number } | null } | null = null;
  /** Whoever Madhu is currently busy with, so sheep stand still for her. */
  private attending: SheepView | null = null;

  constructor() {
    super({ key: 'Ranch', floor: 'tile_grass' });
  }

  private get pasture() {
    return { x0: 18, x1: this.W - 18, y0: 100, y1: Math.min(this.H - 24, 320) };
  }

  protected decorate(): void {
    const { W } = this;
    this.sheep = [];
    this.brushing = null;
    this.attending = null;
    this.add.tileSprite(0, 55, W, 16, 'tile_fence').setOrigin(0).setDepth(56);
    this.add.tileSprite(W / 2 - 16, 72, 32, this.H - 72, 'tile_dirt_path').setOrigin(0).setDepth(-1);

    this.trough = this.floorProp(48, 152, hayInTrough(game.state) ? 'prop_hay_trough' : 'prop_trough_empty');
    this.trough.setInteractive(new Phaser.Geom.Rectangle(-4, -10, 50, 34), Phaser.Geom.Rectangle.Contains);
    this.trough.on('pointerdown', () => this.visitTrough());

    this.place(this.add.sprite(64, 240, 'cat_mango_idle').setOrigin(0.5, 1).play('cat_mango_idle'));

    tickAll(game.state);
    const p = this.pasture;
    game.state.animals.forEach((a, i) => {
      const x = Phaser.Math.Between(p.x0 + 60, p.x1);
      const y = Phaser.Math.Between(p.y0 + 20, p.y1);
      this.addSheep(a, i === 0 ? 190 : x, i === 0 ? 170 : y);
    });

    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.refresh() });
    this.time.addEvent({ delay: 3500, loop: true, callback: () => this.sparkleFullSheep() });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => this.onBrushMove(ptr));
    this.events.once('shutdown', () => this.brushing?.hint.close());
  }

  private addSheep(a: Animal, x: number, y: number): void {
    const stage = fleeceStage(a.growth);
    const key = `${breed(a.breedId).sprite}_stage${stage}`;
    const sprite = this.add.sprite(x, y, key).setOrigin(0.5, 1).play({ key, startFrame: Phaser.Math.Between(0, 1) });
    sprite.setInteractive(new Phaser.Geom.Rectangle(-6, -8, 36, 30), Phaser.Geom.Rectangle.Contains);
    const view: SheepView = { animal: a, sprite, stage, target: null, restUntil: this.time.now + Phaser.Math.Between(500, 4000) };
    sprite.on('pointerdown', () => this.visitSheep(view));
    this.place(sprite);
    this.sheep.push(view);
  }

  /** Re-checks growth stages and the trough (time keeps moving while the room is open). */
  private refresh(): void {
    tickAll(game.state);
    for (const v of this.sheep) {
      const stage = fleeceStage(v.animal.growth);
      if (stage !== v.stage) {
        v.stage = stage;
        const key = `${breed(v.animal.breedId).sprite}_stage${stage}`;
        v.sprite.setTexture(key).play(key);
      }
    }
    this.trough.setTexture(hayInTrough(game.state) ? 'prop_hay_trough' : 'prop_trough_empty');
  }

  private sparkleFullSheep(): void {
    for (const v of this.sheep) {
      if (v.animal.growth >= 1 && Math.random() < 0.6) {
        this.floatFx('fx_sparkle', v.sprite.x + Phaser.Math.Between(-10, 10), v.sprite.y - 22);
      }
    }
  }

  private floatFx(key: string, x: number, y: number): void {
    const fx = this.add.image(x, y, key).setDepth(9000);
    this.tweens.add({ targets: fx, y: y - 14, alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => fx.destroy() });
  }

  /* ---------- trough ---------- */

  private visitTrough(): void {
    if (this.brushing) return;
    this.walkTo(this.trough.x + 30, this.trough.y + 6, () => {
      this.faceToward(this.trough.x, this.trough.y - 6);
      if (hayInTrough(game.state)) {
        toast('The trough is full of hay.');
        return;
      }
      fillHay(game.state);
      game.changed();
      playSfx('fleece_drop');
      this.trough.setTexture('prop_hay_trough');
      this.floatFx('fx_sparkle', this.trough.x, this.trough.y - 18);
      toast('Filled the trough with fresh hay. It lasts a day.');
    });
  }

  /* ---------- sheep care ---------- */

  private visitSheep(view: SheepView): void {
    if (this.brushing) return;
    this.attending = view;
    view.target = null;
    const s = view.sprite;
    const side = this.madhu.x < s.x ? -20 : 20;
    this.walkTo(s.x + side, s.y + 2, () => {
      this.faceToward(s.x, s.y - 4);
      s.setFlipX(side > 0);
      const a = view.animal;
      if (!a.name) {
        openNamePrompt(a, () => this.greet(view));
      } else {
        this.greet(view);
      }
    });
  }

  /** Petting happens on every visit; the happiness boost counts once a day. */
  private greet(view: SheepView): void {
    const a = view.animal;
    const today = dayKey();
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 180, () => this.floatFx('fx_heart', view.sprite.x + Phaser.Math.Between(-8, 8), view.sprite.y - 20));
    }
    playSfx('sheep_baa');
    if (a.lastPetDay !== today) {
      a.lastPetDay = today;
      a.happiness = Math.min(100, a.happiness + CARE.pet);
    }
    game.state.stats.pets += 1;
    game.changed();
    openAnimalCard(a, {
      onBrush: () => this.startBrushing(view),
      onShear: () => this.scene.start('Shear', { animalId: a.id }),
    });
    // let the sheep wander again once the card is dismissed
    this.time.delayedCall(1500, () => {
      if (this.attending === view && !this.brushing) this.attending = null;
    });
  }

  private startBrushing(view: SheepView): void {
    this.attending = view;
    const name = view.animal.name ?? 'her';
    const hint = showHint(`Swipe back and forth over ${name} to brush her fleece.`, {
      label: 'Done',
      onClick: () => this.stopBrushing(false),
    });
    this.brushing = { view, dist: 0, nextFx: 0, hint, last: null };
  }

  protected onFloorTap(): boolean {
    // While brushing, taps and swipes belong to the brush.
    return this.brushing !== null;
  }

  private onBrushMove(ptr: Phaser.Input.Pointer): void {
    const b = this.brushing;
    if (!b) return;
    if (!ptr.isDown) {
      b.last = null;
      return;
    }
    const s = b.view.sprite;
    const bounds = new Phaser.Geom.Rectangle(s.x - 18, s.y - 26, 36, 30);
    if (!bounds.contains(ptr.worldX, ptr.worldY)) {
      b.last = null;
      return;
    }
    if (b.last) b.dist += Phaser.Math.Distance.Between(b.last.x, b.last.y, ptr.worldX, ptr.worldY);
    b.last = { x: ptr.worldX, y: ptr.worldY };
    if (b.dist >= b.nextFx) {
      b.nextFx = b.dist + 28;
      this.floatFx('fx_sparkle', ptr.worldX, ptr.worldY - 4);
      playSfx('card_brush');
    }
    b.hint.set(`Brushing ${b.view.animal.name ?? 'her'}… ${Math.min(100, Math.round((b.dist / BRUSH_GOAL) * 100))}%`);
    if (b.dist >= BRUSH_GOAL) this.stopBrushing(true);
  }

  private stopBrushing(finished: boolean): void {
    const b = this.brushing;
    if (!b) return;
    this.brushing = null;
    b.hint.close();
    this.attending = null;
    const a = b.view.animal;
    if (!finished) return;
    const today = dayKey();
    if (a.lastBrushDay !== today) {
      a.lastBrushDay = today;
      a.happiness = Math.min(100, a.happiness + CARE.brush);
    }
    game.changed();
    playSfx('sheep_baa');
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 150, () => this.floatFx('fx_heart', b.view.sprite.x + Phaser.Math.Between(-10, 10), b.view.sprite.y - 20));
    }
    toast(`${a.name ?? 'She'} looks so pleased. Her fleece is shining.`);
  }

  /* ---------- wandering ---------- */

  update(time: number, delta: number): void {
    super.update(time, delta);
    const p = this.pasture;
    for (const v of this.sheep) {
      if (v === this.attending) continue;
      const s = v.sprite;
      if (!v.target) {
        if (time > v.restUntil) {
          v.target = new Phaser.Math.Vector2(
            Phaser.Math.Clamp(s.x + Phaser.Math.Between(-50, 50), p.x0, p.x1),
            Phaser.Math.Clamp(s.y + Phaser.Math.Between(-30, 30), p.y0, p.y1),
          );
        }
        continue;
      }
      const dx = v.target.x - s.x;
      const dy = v.target.y - s.y;
      const dist = Math.hypot(dx, dy);
      const step = (SHEEP_SPEED * delta) / 1000;
      if (dist <= step) {
        v.target = null;
        v.restUntil = time + Phaser.Math.Between(3000, 9000);
      } else {
        s.x += (dx / dist) * step;
        s.y += (dy / dist) * step;
        if (Math.abs(dx) > 1) s.setFlipX(dx < 0);
        s.setDepth(s.y);
      }
    }
  }
}
