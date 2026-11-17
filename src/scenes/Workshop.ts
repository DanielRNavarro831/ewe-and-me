import Phaser from 'phaser';
import { RoomScene } from './Room';
import { game } from '../game';
import type { FiberItem } from '../systems/state';
import { fiberOf } from '../systems/workshop';
import { openStationPicker, openSpinSetup, openWheelMenu } from '../ui/workshopUi';

interface Station {
  obj: Phaser.GameObjects.Image;
  /** Where Madhu stands to use it. */
  at: { x: number; y: number };
  ready: () => boolean;
  use: () => void;
}

/**
 * The Workshop: skirting table, wash tubs, hand cards, spinning wheel and
 * niddy-noddy. Tap a station; Madhu walks over and picks what to work on.
 * Stations with something waiting sparkle now and then.
 */
export class WorkshopScene extends RoomScene {
  private stations: Station[] = [];

  constructor() {
    super({ key: 'Workshop', wall: 'tile_wall_cream', floor: 'tile_wood_floor' });
  }

  protected decorate(): void {
    this.stations = [];
    const s = () => game.state;
    this.addWindow(this.W / 2);

    const table = this.floorProp(52, 116, 'prop_skirting_table');
    this.station(table, { x: 52, y: 128 }, () => fiberOf(s(), 'fleece').length > 0, () =>
      openStationPicker({
        title: 'Skirting table',
        intro: 'Lay a fleece cut-side down and skirt away the tags, belly wool and VM.',
        items: fiberOf(s(), 'fleece'),
        action: 'Skirt',
        empty: 'No raw fleeces waiting. Shear a sheep at the Ranch.',
        onPick: (f) => this.play('Skirt', f),
      }),
    );

    const tub = this.floorProp(222, 112, 'prop_wash_tub');
    this.station(tub, { x: 222, y: 126 }, () => fiberOf(s(), 'skirted').length > 0, () =>
      openStationPicker({
        title: 'Wash tubs',
        intro: 'Scour a skirted fleece: hot water and wool wash melt the lanolin; agitation felts it.',
        items: fiberOf(s(), 'skirted'),
        action: 'Scour',
        empty: 'Nothing to scour. Skirt a fleece at the skirting table first.',
        onPick: (f) => this.play('Scour', f),
      }),
    );

    const cards = this.floorProp(48, 200, 'prop_carding_bench');
    this.station(cards, { x: 76, y: 204 }, () => fiberOf(s(), 'clean').length > 0, () =>
      openStationPicker({
        title: 'Hand cards',
        intro: 'Card clean wool into rolags for woolen spinning.',
        items: fiberOf(s(), 'clean'),
        action: 'Card',
        empty: 'No clean wool yet. Scour a skirted fleece at the wash tubs.',
        onPick: (f) => this.play('Card', f),
      }),
    );

    const wheel = this.floorProp(this.W / 2 + 20, 196, 'prop_spinning_wheel');
    this.station(wheel, { x: this.W / 2 - 6, y: 200 }, () => fiberOf(s(), ['rolags', 'top', 'singles']).length > 0, () =>
      openWheelMenu(fiberOf(s(), ['rolags', 'top']), fiberOf(s(), 'singles'), {
        spin: (f) => openSpinSetup(f, (setup) => this.scene.start('Spin', { itemId: f.id, setup })),
        ply: (ids, chain) => this.scene.start('Ply', { itemId: ids[0], itemIds: ids, chain }),
      }),
    );

    const niddy = this.wallProp(206, 18, 'prop_niddy_noddy');
    this.station(niddy, { x: 220, y: 100 }, () => fiberOf(s(), ['singles', 'plied']).length > 0, () =>
      openStationPicker({
        title: 'Niddy-noddy',
        intro: 'Wind a bobbin into a skein, tie it, soak it, thwack it and measure its WPI.',
        items: [...fiberOf(s(), 'plied'), ...fiberOf(s(), 'singles')],
        action: 'Finish',
        empty: 'No bobbins to finish. Spin (and ply) at the wheel first.',
        onPick: (f) => this.play('Finish', f),
      }),
    );

    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.sparkleReady() });
  }

  private station(obj: Phaser.GameObjects.Image, at: { x: number; y: number }, ready: () => boolean, use: () => void): void {
    const pad = 8;
    obj.setInteractive(new Phaser.Geom.Rectangle(-pad, -pad, obj.width + pad * 2, obj.height + pad * 2), Phaser.Geom.Rectangle.Contains);
    obj.on('pointerdown', () => {
      this.walkTo(at.x, at.y, () => {
        this.faceToward(obj.x, obj.y - obj.height / 2);
        use();
      });
    });
    this.stations.push({ obj, at, ready, use });
  }

  private sparkleReady(): void {
    for (const st of this.stations) {
      if (!st.ready() || Math.random() < 0.3) continue;
      const b = st.obj.getBounds();
      const fx = this.add.image(Phaser.Math.Between(b.left + 4, b.right - 4), b.top + 2, 'fx_sparkle').setDepth(9000);
      this.tweens.add({ targets: fx, y: fx.y - 12, alpha: 0, duration: 900, onComplete: () => fx.destroy() });
    }
  }

  private play(key: string, f: FiberItem): void {
    this.scene.start(key, { itemId: f.id });
  }
}
