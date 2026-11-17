import Phaser from 'phaser';
import { game } from '../game';
import type { SceneKey } from '../systems/state';
import { clock, lightingAt } from '../systems/clock';
import { hex } from '../art/palette';

type Dir = 'down' | 'up' | 'left' | 'right';

export interface RoomConfig {
  key: SceneKey;
  /** Wallpaper tile key; omit for outdoor scenes. */
  wall?: string;
  floor: string;
}

const WALL_H = 72;
const SPEED = 70; // logical px per second

/**
 * A small room Madhu walks around by tapping. Subclasses add furniture in
 * `decorate()`. Handles lighting by time of day and remembers her position.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected madhu!: Phaser.GameObjects.Sprite;
  protected facing: Dir = 'down';
  protected floorTop = WALL_H;
  private target: Phaser.Math.Vector2 | null = null;
  private lightOverlay!: Phaser.GameObjects.Rectangle;
  private skyRects: Phaser.GameObjects.Rectangle[] = [];
  private lightTimer?: Phaser.Time.TimerEvent;

  constructor(protected readonly room: RoomConfig) {
    super(room.key);
  }

  get W(): number {
    return this.scale.width;
  }
  get H(): number {
    return this.scale.height;
  }

  create(): void {
    this.skyRects = [];
    this.buildBackground();
    this.decorate();
    this.spawnMadhu();

    this.lightOverlay = this.add.rectangle(0, 0, this.W, this.H, 0x000000, 0).setOrigin(0).setDepth(10_000);
    this.applyLighting();
    this.lightTimer = this.time.addEvent({ delay: 15_000, loop: true, callback: () => this.applyLighting() });
    const unsub = game.onChange(() => this.applyLighting());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      // Taps on interactive things (sheep, trough…) are handled by those objects.
      if (over.length || this.onFloorTap(p)) return;
      this.walkTo(p.worldX, p.worldY);
    });
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => {
      unsub();
      this.lightTimer?.remove();
      this.scale.off('resize', this.onResize, this);
    });
  }

  /** Furniture and characters for this room. */
  protected abstract decorate(): void;

  /** Lets a room claim a tap on empty floor (return true to stop Madhu walking). */
  protected onFloorTap(_p: Phaser.Input.Pointer): boolean {
    return false;
  }

  private onResize(): void {
    // Rebuild the room at the new size (e.g. phone rotated or browser resized).
    this.scene.restart();
  }

  protected buildBackground(): void {
    const { W, H } = this;
    if (this.room.wall) {
      this.add.tileSprite(0, 0, W, WALL_H, this.room.wall).setOrigin(0);
      // baseboard
      this.add.rectangle(0, WALL_H - 4, W, 4, hex('W')).setOrigin(0);
      this.add.rectangle(0, WALL_H - 1, W, 1, hex('D')).setOrigin(0);
      this.add.tileSprite(0, WALL_H, W, H - WALL_H, this.room.floor).setOrigin(0);
      this.floorTop = WALL_H + 6;
    } else {
      const sky = this.add.rectangle(0, 0, W, 48, hex('b')).setOrigin(0);
      this.skyRects.push(sky);
      // distant hills
      const hills = this.add.graphics();
      hills.fillStyle(hex('G'));
      for (let x = -20; x < W + 40; x += 60) hills.fillEllipse(x, 50, 90, 28);
      this.add.tileSprite(0, 44, W, H - 44, this.room.floor).setOrigin(0);
      this.floorTop = 72;
    }
  }

  /** Adds a window on the back wall whose panes follow the sky color. */
  protected addWindow(x: number): Phaser.GameObjects.Image {
    const img = this.add.image(x, 5, 'prop_window').setOrigin(0.5, 0);
    // tint the upper panes with the live sky color
    for (const px of [x - 10, x + 1]) {
      const sky = this.add.rectangle(px, 8, 9, 10, hex('b')).setOrigin(0).setDepth(img.depth + 0.5).setAlpha(0.6);
      this.skyRects.push(sky);
    }
    return img;
  }

  /** A prop standing on the floor, anchored at its feet and depth-sorted with Madhu. */
  protected floorProp(x: number, y: number, key: string): Phaser.GameObjects.Image {
    return this.place(this.add.image(x, y, key).setOrigin(0.5, 1));
  }

  /** A prop hung on the back wall, behind everything on the floor. */
  protected wallProp(x: number, y: number, key: string): Phaser.GameObjects.Image {
    return this.add.image(x, y, key).setOrigin(0).setDepth(1);
  }

  /** Places a sprite on the floor with depth sorted by its feet. */
  protected place<T extends Phaser.GameObjects.Components.Depth & Phaser.GameObjects.Components.Transform>(obj: T): T {
    obj.setDepth(obj.y);
    return obj;
  }

  private spawnMadhu(): void {
    const saved = game.state.positions[this.room.key];
    const x = saved ? Phaser.Math.Clamp(saved.x, 10, this.W - 10) : this.W / 2;
    const y = saved ? Phaser.Math.Clamp(saved.y, this.floorTop + 20, this.H - 6) : Math.min(this.H - 40, this.floorTop + 120);
    this.madhu = this.add.sprite(x, y, 'char_madhu_idle_down').setOrigin(0.5, 1);
    this.madhu.play('char_madhu_idle_down');
    this.place(this.madhu);
  }

  /** Walks Madhu to a spot; `onArrive` runs when she gets there (not if she's sent elsewhere first). */
  protected walkTo(x: number, y: number, onArrive?: () => void): void {
    const tx = Phaser.Math.Clamp(Math.round(x), 8, this.W - 8);
    const ty = Phaser.Math.Clamp(Math.round(y), this.floorTop + 20, this.H - 4);
    this.target = new Phaser.Math.Vector2(tx, ty);
    this.onArrive = onArrive ?? null;
  }

  /** Turns Madhu to look at a point. */
  protected faceToward(x: number, y: number): void {
    const dx = x - this.madhu.x;
    const dy = y - this.madhu.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.madhu.play(`char_madhu_idle_${this.facing}`, true);
  }

  private onArrive: (() => void) | null = null;

  update(_time: number, delta: number): void {
    if (!this.target || !this.madhu) return;
    const pos = new Phaser.Math.Vector2(this.madhu.x, this.madhu.y);
    const to = this.target.clone().subtract(pos);
    const dist = to.length();
    const step = (SPEED * delta) / 1000;
    if (dist <= step) {
      this.madhu.setPosition(this.target.x, this.target.y);
      this.target = null;
      this.madhu.play(`char_madhu_idle_${this.facing}`, true);
      game.state.positions[this.room.key] = { x: this.madhu.x, y: this.madhu.y };
      game.changed();
      const cb = this.onArrive;
      this.onArrive = null;
      cb?.();
    } else {
      to.scale(step / dist);
      this.madhu.setPosition(this.madhu.x + to.x, this.madhu.y + to.y);
      this.facing = Math.abs(to.x) > Math.abs(to.y) ? (to.x > 0 ? 'right' : 'left') : to.y > 0 ? 'down' : 'up';
      this.madhu.play(`char_madhu_walk_${this.facing}`, true);
    }
    // whole-pixel positions keep pixel art crisp
    this.madhu.setDepth(this.madhu.y);
  }

  protected applyLighting(): void {
    if (!this.lightOverlay) return;
    const light = lightingAt(clock.date());
    this.lightOverlay.setFillStyle(light.color, light.alpha);
    for (const r of this.skyRects) r.setFillStyle(light.sky);
  }
}
