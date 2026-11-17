import type { PixelMap } from './grid';
import { madhuFrames, villagerFrames } from './characters';
import { VILLAGERS } from '../data/customers';
import { sheepFrames, catFrames } from './animals';
import { grassTile, woodFloorTile, wallTile, dirtPathTile, fenceTile, windowSprite } from './tiles';
import * as props from './props';
import { FX_HEART, FX_SPARKLE, FX_SNIP } from './fx';
import { iconRanch, iconWorkshop, iconDye, iconShop, iconStash, iconCollection, iconSettings } from './icons';

/**
 * Code-drawn placeholder frames for every sprite key in the manifest.
 * Built lazily once at startup.
 */
export function buildPlaceholders(): Record<string, PixelMap[]> {
  return {
    ...madhuFrames(),
    ...sheepFrames(),
    ...catFrames(),
    tile_grass: [grassTile(1)],
    tile_grass_b: [grassTile(2)],
    tile_dirt_path: [dirtPathTile()],
    tile_wood_floor: [woodFloorTile()],
    tile_wall_cream: [wallTile('w', 'l')],
    tile_wall_teal: [wallTile('b', 'B')],
    tile_wall_rose: [wallTile('x', 'w')],
    tile_wall_lavender: [wallTile('v', 'l')],
    tile_fence: [fenceTile()],
    prop_window: [windowSprite()],
    prop_spinning_wheel: [props.spinningWheel()],
    prop_hay_trough: [props.hayTrough()],
    prop_trough_empty: [props.hayTrough(false)],
    fx_heart: [FX_HEART],
    fx_sparkle: [FX_SPARKLE],
    fx_snip: [FX_SNIP],
    prop_skirting_table: [props.skirtingTable()],
    prop_wash_tub: [props.washTub()],
    prop_dye_stove: [props.dyeStove()],
    prop_dye_shelf: [props.dyeShelf()],
    prop_drying_rack: [props.dryingRack()],
    prop_shop_shelf: [props.shopShelf()],
    prop_counter: [props.counter()],
    prop_knitting_table: [props.knittingTable()],
    prop_cubby: [props.cubby()],
    prop_picture_frame: [props.pictureFrame()],
    prop_book_stand: [props.bookStand()],
    prop_yarn_basket: [props.yarnBasket()],
    prop_carding_bench: [props.cardingBench()],
    prop_skein: [props.skein()],
    prop_shop_door: [props.shopDoor()],
    ...Object.assign({}, ...VILLAGERS.map((v) => villagerFrames(v.id, v))),
    prop_niddy_noddy: [props.niddyNoddy()],
    icon_ranch: [iconRanch()],
    icon_workshop: [iconWorkshop()],
    icon_dye: [iconDye()],
    icon_shop: [iconShop()],
    icon_stash: [iconStash()],
    icon_collection: [iconCollection()],
    icon_settings: [iconSettings()],
  };
}
