import { RoomScene } from './Room';

/**
 * The six places Madhu can be. In M0 they are furnished rooms to walk around;
 * the craft stations become interactive in later milestones.
 * Floor props use origin (0.5, 1) at their feet so they depth-sort with Madhu;
 * wall props sit behind everything.
 */

export class RanchScene extends RoomScene {
  constructor() {
    super({ key: 'Ranch', floor: 'tile_grass' });
  }
  protected decorate(): void {
    const { W } = this;
    // fence along the back of the pasture
    this.add.tileSprite(0, 55, W, 16, 'tile_fence').setOrigin(0).setDepth(56);
    // dirt path down to the barn door
    this.add.tileSprite(W / 2 - 16, 72, 32, this.H - 72, 'tile_dirt_path').setOrigin(0).setDepth(-1);
    this.floorProp(48, 152, 'prop_hay_trough');
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
    this.floorProp(52, 116, 'prop_skirting_table');
    this.floorProp(222, 112, 'prop_wash_tub');
    this.floorProp(this.W / 2, 196, 'prop_spinning_wheel');
  }
}

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

export class ShopScene extends RoomScene {
  constructor() {
    super({ key: 'Shop', wall: 'tile_wall_rose', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    this.addWindow(this.W - 36);
    // empty shelves on the back wall (6 slots to start)
    for (let row = 0; row < 2; row++) for (let s = 0; s < 3; s++) this.wallProp(8 + s * 52, 12 + row * 24, 'prop_shop_shelf');
    this.floorProp(205, 172, 'prop_counter');
    // Iroh napping on the counter
    this.add.sprite(200, 144, 'cat_iroh_sleep').setOrigin(0.5, 1).setDepth(173).play('cat_iroh_sleep');
    this.floorProp(70, 268, 'prop_knitting_table');
  }
}

export class StashScene extends RoomScene {
  constructor() {
    super({ key: 'Stash', wall: 'tile_wall_lavender', floor: 'tile_wood_floor' });
  }
  protected decorate(): void {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) this.wallProp(9 + c * 42, 4 + r * 21, 'prop_cubby');
    this.floorProp(130, 172, 'prop_yarn_basket');
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
