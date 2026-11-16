import type { PixelMap } from './grid';
import { madhuFrames } from './characters';
import { sheepFrames, catFrames } from './animals';
import { grassTile, woodFloorTile, wallTile, dirtPathTile, fenceTile, windowSprite } from './tiles';
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
    icon_ranch: [iconRanch()],
    icon_workshop: [iconWorkshop()],
    icon_dye: [iconDye()],
    icon_shop: [iconShop()],
    icon_stash: [iconStash()],
    icon_collection: [iconCollection()],
    icon_settings: [iconSettings()],
  };
}
