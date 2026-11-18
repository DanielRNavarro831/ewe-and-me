import Phaser from 'phaser';
import { RoomScene } from './Room';
import { game } from '../game';
import { hex } from '../art/palette';
import { dyeable, isDrying } from '../systems/dye';
import { openDryingRack, openPotLoader, openSwatchBook } from '../ui/dyeUi';

/**
 * The Dye Studio: the stove and dye pot, the shelf of dye stock (and the
 * swatch book), and the drying rack where freshly dyed skeins hang.
 */
export class DyeStudioScene extends RoomScene {
  private hanging: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'DyeStudio', wall: 'tile_wall_teal', floor: 'tile_wood_floor' });
  }

  protected decorate(): void {
    this.hanging = [];
    this.addWindow(50);

    const start = (yarnIds: string[], colorwayId?: string) => this.scene.start('Dye', { yarnIds, colorwayId });

    const shelf = this.wallProp(150, 8, 'prop_dye_shelf');
    shelf.setInteractive(new Phaser.Geom.Rectangle(-4, -4, 74, 40), Phaser.Geom.Rectangle.Contains);
    shelf.on('pointerdown', () =>
      this.walkTo(183, this.floorTop + 22, () => {
        this.faceToward(183, 20);
        openSwatchBook((c) => openPotLoader(start, c));
      }),
    );

    const stove = this.floorProp(120, 170, 'prop_dye_stove');
    stove.setInteractive(new Phaser.Geom.Rectangle(-6, -6, 50, 48), Phaser.Geom.Rectangle.Contains);
    stove.on('pointerdown', () =>
      this.walkTo(150, 176, () => {
        this.faceToward(120, 150);
        openPotLoader(start);
      }),
    );

    const rack = this.floorProp(226, 164, 'prop_drying_rack');
    rack.setInteractive(new Phaser.Geom.Rectangle(-4, -4, 54, 60), Phaser.Geom.Rectangle.Contains);
    rack.on('pointerdown', () =>
      this.walkTo(200, 172, () => {
        this.faceToward(226, 140);
        openDryingRack();
      }),
    );

    this.drawHanging();
    this.time.addEvent({ delay: 10_000, loop: true, callback: () => this.drawHanging() });
    this.time.addEvent({
      delay: 2800,
      loop: true,
      callback: () => {
        if (dyeable(game.state).length) this.sparkle(stove);
      },
    });
  }

  /** Skeins drying on the rack, in their new colors. */
  private drawHanging(): void {
    for (const h of this.hanging) h.destroy();
    this.hanging = [];
    const drying = game.state.yarns.filter((y) => isDrying(y)).slice(0, 4);
    drying.forEach((y, i) => {
      const img = this.add
        .image(212 + i * 9, 122, 'prop_skein')
        .setAngle(90)
        .setDepth(166)
        .setTint(parseInt((y.dye?.hex ?? '#FFFFFF').slice(1), 16));
      this.hanging.push(img);
    });
    if (drying.length) {
      // a few drips
      const d = this.add.rectangle(214, 136, 1, 2, hex('b')).setDepth(167);
      this.tweens.add({ targets: d, y: 160, alpha: 0, duration: 900, onComplete: () => d.destroy() });
    }
  }

  private sparkle(obj: Phaser.GameObjects.Image): void {
    const b = obj.getBounds();
    const fx = this.add.image(Phaser.Math.Between(b.left + 4, b.right - 4), b.top + 2, 'fx_sparkle').setDepth(9000);
    this.tweens.add({ targets: fx, y: fx.y - 12, alpha: 0, duration: 900, onComplete: () => fx.destroy() });
  }
}
