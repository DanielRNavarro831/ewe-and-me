import Phaser from 'phaser';
import { RoomScene } from './Room';
import { game } from '../game';
import { hex } from '../art/palette';
import { tidyShelves, yarnHex } from '../systems/economy';
import { completeVisit, decide, type Customer } from '../systems/customers';
import type { CustomerHost } from '../systems/shopService';
import { playSfx } from '../systems/audio';
import { openLedger, openShelfSlot } from '../ui/shopUi';

const WALK_SPEED = 40; // px per second
const DOOR_X = 193;

/**
 * The yarn shop: six shelf slots to stock, a counter with the sales ledger,
 * and walk-in customers who browse, think out loud and buy what suits them.
 */
export class ShopScene extends RoomScene implements CustomerHost {
  private skeins: (Phaser.GameObjects.Image | null)[] = [];
  private visitors = new Set<Phaser.GameObjects.Sprite>();

  constructor() {
    super({ key: 'Shop', wall: 'tile_wall_rose', floor: 'tile_wood_floor' });
  }

  private slotPos(i: number): { x: number; y: number } {
    const row = Math.floor(i / 3);
    const col = i % 3;
    return { x: 8 + col * 52, y: 12 + row * 24 };
  }

  protected decorate(): void {
    this.skeins = [];
    this.visitors = new Set();
    tidyShelves(game.state);
    this.addWindow(this.W - 36);

    for (let i = 0; i < game.state.shop.slots; i++) {
      const { x, y } = this.slotPos(i);
      const shelf = this.wallProp(x, y, 'prop_shop_shelf');
      shelf.setInteractive(new Phaser.Geom.Rectangle(0, -10, 50, 26), Phaser.Geom.Rectangle.Contains);
      shelf.on('pointerdown', () =>
        this.walkTo(x + 25, this.floorTop + 24, () => {
          this.faceToward(x + 25, y);
          openShelfSlot(i, () => this.refreshShelves());
        }),
      );
    }
    this.refreshShelves();

    const counter = this.floorProp(205, 172, 'prop_counter');
    counter.setInteractive(new Phaser.Geom.Rectangle(-4, -6, 110, 40), Phaser.Geom.Rectangle.Contains);
    counter.on('pointerdown', () =>
      this.walkTo(205, 192, () => {
        this.faceToward(205, 160);
        openLedger();
      }),
    );
    this.add.sprite(200, 144, 'cat_iroh_sleep').setOrigin(0.5, 1).setDepth(173).play('cat_iroh_sleep');
    this.floorProp(70, 268, 'prop_knitting_table');

    // the front door, on the back wall beside the shelves, with a little mat
    this.wallProp(DOOR_X - 13, this.floorTop - 6 - 44, 'prop_shop_door');
    const mat = this.add.graphics().setDepth(1);
    mat.fillStyle(hex('o')).fillRect(DOOR_X - 15, this.floorTop - 4, 30, 9);
    mat.fillStyle(hex('x')).fillRect(DOOR_X - 13, this.floorTop - 3, 26, 7);
    mat.fillStyle(hex('w')).fillRect(DOOR_X - 9, this.floorTop, 18, 1);

    this.events.once('shutdown', () => this.visitors.forEach((v) => v.destroy()));
  }

  /** Draws the skeins currently on the shelves, tinted their real colors. */
  refreshShelves(): void {
    for (const s of this.skeins) s?.destroy();
    this.skeins = [];
    const st = game.state;
    st.shop.shelf.forEach((id, i) => {
      const y = id ? st.yarns.find((v) => v.id === id) : undefined;
      if (!y) {
        this.skeins.push(null);
        return;
      }
      const p = this.slotPos(i);
      const img = this.add
        .image(p.x + 25, p.y + 10, 'prop_skein')
        .setOrigin(0.5, 1)
        .setDepth(2)
        .setTint(parseInt(yarnHex(y).slice(1), 16));
      this.skeins.push(img);
    });
  }

  /* ---------- customers ---------- */

  receive(c: Customer): void {
    playSfx('shop_bell');
    const key = `char_${c.look.id}`;
    // step in through the door
    const v = this.add.sprite(DOOR_X, this.floorTop + 4, `${key}_walk_down`).setOrigin(0.5, 1).setAlpha(0);
    this.tweens.add({ targets: v, alpha: 1, duration: 300 });
    this.visitors.add(v);
    // browse near a stocked shelf if there is one
    const stocked = game.state.shop.shelf.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
    const slot = stocked.length ? stocked[Math.floor(Math.random() * stocked.length)] : Math.floor(Math.random() * 6);
    const sp = this.slotPos(slot);
    const browse = { x: sp.x + 25 + Phaser.Math.Between(-6, 6), y: this.floorTop + 30 + Phaser.Math.Between(0, 14) };

    this.walk(v, key, browse, () => {
      const bubble = this.thought(v, c.prefs.map((p) => p.label));
      this.time.delayedCall(2600, () => {
        bubble.destroy();
        const visit = decide(game.state, c);
        // The sale is settled right away so nothing is lost if Madhu leaves the room.
        const sale = completeVisit(game.state, visit);
        if (sale) {
          game.changed();
          this.refreshShelves();
        }
        const said = this.thought(v, [visit.line], true);
        this.time.delayedCall(2200, () => said.destroy());
        if (sale) {
          this.walk(v, key, { x: 172, y: 196 }, () => {
            playSfx('coin');
            this.floatText(`+$${sale.price + sale.tip}`, v.x, v.y - 30);
            this.time.delayedCall(500, () => this.leave(v, key));
          });
        } else {
          this.time.delayedCall(900, () => this.leave(v, key));
        }
      });
    });
  }

  private leave(v: Phaser.GameObjects.Sprite, key: string): void {
    this.walk(v, key, { x: DOOR_X, y: this.floorTop + 4 }, () => {
      playSfx('shop_bell');
      this.tweens.add({
        targets: v,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.visitors.delete(v);
          v.destroy();
        },
      });
    });
  }

  private walk(v: Phaser.GameObjects.Sprite, key: string, to: { x: number; y: number }, done: () => void): void {
    const dist = Phaser.Math.Distance.Between(v.x, v.y, to.x, to.y);
    v.play(`${key}_walk_${to.y < v.y ? 'up' : 'down'}`, true);
    this.tweens.add({
      targets: v,
      x: to.x,
      y: to.y,
      duration: (dist / WALK_SPEED) * 1000,
      onUpdate: () => v.setDepth(v.y),
      onComplete: () => {
        v.anims.stop();
        v.setFrame(0);
        done();
      },
    });
  }

  /** A thought (or speech) bubble that follows a visitor. */
  private thought(v: Phaser.GameObjects.Sprite, lines: string[], speech = false): Phaser.GameObjects.Container {
    const text = this.add
      .text(0, 0, lines.join('\n'), {
        fontFamily: 'Pixelify Sans',
        fontSize: '9px',
        color: '#2B1E1E',
        align: 'center',
        wordWrap: { width: 110 },
        lineSpacing: 1,
      })
      .setOrigin(0.5, 1)
      .setResolution(4);
    const w = Math.ceil(text.width) + 10;
    const h = Math.ceil(text.height) + 8;
    const g = this.add.graphics();
    g.fillStyle(hex('o')).fillRoundedRect(-w / 2 - 1, -h - 1, w + 2, h + 2, 4);
    g.fillStyle(hex('w')).fillRoundedRect(-w / 2, -h, w, h, 3);
    if (speech) g.fillStyle(hex('w')).fillTriangle(-4, 0, 4, 0, 0, 5);
    else g.fillStyle(hex('w')).fillCircle(0, 4, 2).fillCircle(3, 9, 1.5);
    text.setPosition(0, -4);
    // keep the bubble on screen
    const x = Phaser.Math.Clamp(v.x, w / 2 + 2, this.W - w / 2 - 2);
    const c = this.add.container(x, v.y - 28, [g, text]).setDepth(9500);
    const follow = () => c.setPosition(Phaser.Math.Clamp(v.x, w / 2 + 2, this.W - w / 2 - 2), v.y - 28);
    this.events.on('update', follow);
    c.once('destroy', () => this.events.off('update', follow));
    return c;
  }

  private floatText(t: string, x: number, y: number): void {
    const txt = this.add
      .text(x, y, t, { fontFamily: 'Pixelify Sans', fontSize: '12px', color: '#D9A43A', stroke: '#2B1E1E', strokeThickness: 3 })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(9600);
    this.tweens.add({ targets: txt, y: y - 22, alpha: 0, duration: 1300, onComplete: () => txt.destroy() });
  }
}
