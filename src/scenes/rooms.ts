import { RoomScene } from './Room';
import { game } from '../game';
import { hex } from '../art/palette';
import { breed, naturalColor } from '../data/breeds';
import Phaser from 'phaser';
import { RanchScene } from './Ranch';
import { WorkshopScene } from './Workshop';
import { ShopScene } from './Shop';
import { openStash } from '../ui/workshopUi';
import { showHint } from '../ui/modal';

/**
 * The six places Madhu can be. In M0 they are furnished rooms to walk around;
 * the craft stations become interactive in later milestones.
 * Floor props use origin (0.5, 1) at their feet so they depth-sort with Madhu;
 * wall props sit behind everything.
 */

export class DyeStudioScene extends RoomScene {
  constructor() {
    super({ key: 'DyeStudio', wall: 'tile_wall_teal', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    this.addWindow(50);
    this.wallProp(150, 8, 'prop_dye_shelf');
    this.floorProp(120, 170, 'prop_dye_stove');
    this.floorProp(226, 164, 'prop_drying_rack');
  }
}

export class StashScene extends RoomScene {
  constructor() {
    super({ key: 'Stash', wall: 'tile_wall_lavender', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    const s = game.state;
    // cubbies fill up with skeins as the stash grows
    const skeins = [...s.yarns].reverse();
    let i = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) {
        const x = 9 + c * 42;
        const y = 4 + r * 21;
        const cubby = this.wallProp(x, y, 'prop_cubby');
        cubby.setInteractive().on('pointerdown', () => openStash('yarn'));
        const inCubby = skeins.slice(i * 2, i * 2 + 2);
        inCubby.forEach((yarn, k) => {
          const hexStr = yarn.dye?.hex ?? naturalColor(breed(yarn.breedId), yarn.colorId).hex;
          const col = parseInt(hexStr.slice(1), 16);
          this.add.ellipse(x + 10 + k * 14, y + 12, 12, 9, col).setStrokeStyle(1, hex('o')).setDepth(2);
        });
        i++;
      }
    }
    const extra = skeins.length - 36;
    if (extra > 0) this.add.text(this.W - 8, 68, `+${extra}`, { fontFamily: 'Pixelify Sans', fontSize: '10px', color: '#2B1E1E' }).setOrigin(1, 1).setResolution(4).setDepth(3);

    // the basket holds fiber in progress
    const basket = this.floorProp(130, 172, 'prop_yarn_basket');
    basket.setInteractive(new Phaser.Geom.Rectangle(-8, -10, 46, 40), Phaser.Geom.Rectangle.Contains);
    basket.on('pointerdown', () => this.walkTo(basket.x + 24, basket.y + 4, () => openStash('fiber')));

    const hint = showHint('Tap the cubbies for skeins, or the basket for fiber in progress.', { label: 'Open', onClick: () => openStash('yarn') });
    this.time.delayedCall(6000, () => hint.close());
    this.events.once('shutdown', () => hint.close());
  }
}

export class CollectionScene extends RoomScene {
  constructor() {
    super({ key: 'Collection', wall: 'tile_wall_cream', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    this.addWindow(36);
    for (let i = 0; i < 4; i++) this.wallProp(90 + i * 44, 16, 'prop_picture_frame');
    this.floorProp(this.W / 2, 176, 'prop_book_stand');
  }
}

export const ROOMS = [RanchScene, WorkshopScene, DyeStudioScene, ShopScene, StashScene, CollectionScene];
