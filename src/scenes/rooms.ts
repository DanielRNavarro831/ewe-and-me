import { RoomScene } from './Room';
import { hex } from '../art/palette';

/**
 * The six places Madhu can be. In M0 they are furnished rooms to walk around;
 * the craft stations become interactive in later milestones.
 */

export class RanchScene extends RoomScene {
  constructor() {
    super({ key: 'Ranch', floor: 'tile_grass' });
  }
  protected decorate(): void {
    const { W } = this;
    // fence along the back of the pasture
    this.add.tileSprite(0, 56, W, 16, 'tile_fence').setOrigin(0).setDepth(56);
    // dirt path down to the barn door
    this.add.tileSprite(W / 2 - 16, 72, 32, this.H - 72, 'tile_dirt_path').setOrigin(0).setDepth(-1);
    // hay trough
    const g = this.add.graphics().setDepth(150);
    g.fillStyle(hex('D')).fillRect(28, 140, 40, 12);
    g.fillStyle(hex('W')).fillRect(29, 141, 38, 7);
    g.fillStyle(hex('y')).fillRect(31, 138, 34, 4);
    // a Merino grazing
    this.place(this.add.sprite(190, 150, 'sheep_merino_stage3').setOrigin(0.5, 1).play('sheep_merino_stage3'));
    this.place(this.add.sprite(64, 230, 'cat_mango_idle').setOrigin(0.5, 1).play('cat_mango_idle'));
  }
}

export class WorkshopScene extends RoomScene {
  constructor() {
    super({ key: 'Workshop', wall: 'tile_wall_cream', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    this.addWindow(this.W / 2);
    const g = this.add.graphics().setDepth(100);
    // skirting table
    g.fillStyle(hex('D')).fillRect(16, 96, 72, 4).fillRect(18, 100, 4, 18).fillRect(82, 100, 4, 18);
    g.fillStyle(hex('L')).fillRect(16, 92, 72, 5);
    // wash tubs
    g.fillStyle(hex('m')).fillEllipse(212, 104, 40, 14).fillStyle(hex('b')).fillEllipse(212, 102, 34, 8);
    // the old castle wheel, as a big icon until M2
    this.place(this.add.image(this.W / 2, 180, 'icon_workshop').setOrigin(0.5, 1).setScale(3));
  }
}

export class DyeStudioScene extends RoomScene {
  constructor() {
    super({ key: 'DyeStudio', wall: 'tile_wall_teal', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    this.addWindow(60);
    const g = this.add.graphics().setDepth(90);
    // dye shelf with jars of the three primaries
    g.fillStyle(hex('W')).fillRect(160, 30, 90, 4).fillRect(160, 52, 90, 4);
    const jars = ['x', 'y', 't', 'n'];
    jars.forEach((c, i) => {
      g.fillStyle(hex('w')).fillRect(166 + i * 20, 20, 12, 10);
      g.fillStyle(hex(c)).fillRect(167 + i * 20, 23, 10, 7);
    });
    // stove and dye pot
    this.place(this.add.image(130, 160, 'icon_dye').setOrigin(0.5, 1).setScale(3));
    // drying rack
    g.fillStyle(hex('D')).fillRect(200, 110, 4, 60).fillRect(244, 110, 4, 60).fillRect(200, 112, 48, 3);
  }
}

export class ShopScene extends RoomScene {
  constructor() {
    super({ key: 'Shop', wall: 'tile_wall_rose', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    const { W } = this;
    this.addWindow(W - 40);
    const g = this.add.graphics().setDepth(80);
    // empty shelves on the back wall (6 slots to start)
    for (let row = 0; row < 2; row++) {
      g.fillStyle(hex('D')).fillRect(12, 30 + row * 22, 150, 3);
      for (let s = 0; s < 3; s++) {
        g.fillStyle(hex('W')).fillRect(16 + s * 50, 18 + row * 22, 40, 12);
      }
    }
    // counter
    const c = this.add.graphics().setDepth(170);
    c.fillStyle(hex('W')).fillRect(150, 150, 110, 22);
    c.fillStyle(hex('L')).fillRect(150, 146, 110, 6);
    c.fillStyle(hex('D')).fillRect(150, 171, 110, 2);
    // Iroh napping on the counter
    this.add.sprite(200, 148, 'cat_iroh_sleep').setOrigin(0.5, 1).setDepth(171).play('cat_iroh_sleep');
    // knitting circle table
    const t = this.add.graphics().setDepth(260);
    t.fillStyle(hex('D')).fillEllipse(70, 262, 70, 24);
    t.fillStyle(hex('L')).fillEllipse(70, 258, 70, 22);
  }
}

export class StashScene extends RoomScene {
  constructor() {
    super({ key: 'Stash', wall: 'tile_wall_lavender', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    const g = this.add.graphics().setDepth(80);
    // cubby shelves, empty for now
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      g.fillStyle(hex('D')).fillRect(20 + c * 40, 10 + r * 20, 34, 18);
      g.fillStyle(hex('W')).fillRect(22 + c * 40, 12 + r * 20, 30, 14);
    }
    // a lone ball of yarn waiting for company
    this.place(this.add.image(130, 170, 'icon_stash').setOrigin(0.5, 1).setScale(2));
  }
}

export class CollectionScene extends RoomScene {
  constructor() {
    super({ key: 'Collection', wall: 'tile_wall_cream', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    this.addWindow(40);
    const g = this.add.graphics().setDepth(80);
    // empty finished-objects wall: little frames
    for (let i = 0; i < 4; i++) {
      g.lineStyle(2, hex('W')).strokeRect(100 + i * 40, 18, 30, 30);
    }
    this.place(this.add.image(this.W / 2, 170, 'icon_collection').setOrigin(0.5, 1).setScale(3));
  }
}

export const ROOMS = [RanchScene, WorkshopScene, DyeStudioScene, ShopScene, StashScene, CollectionScene];
