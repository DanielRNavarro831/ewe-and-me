/**
 * The art and audio manifest. Every asset has a key. At startup the game looks for
 *   public/assets/sprites/<key>.png        (sprites)
 *   public/assets/audio/sfx/<key>.mp3      (sound effects)
 *   public/assets/audio/music/<key>.mp3    (music)
 * and uses the file if it is there; otherwise it uses the code-drawn / synthesized placeholder.
 *
 * Sprite PNGs are horizontal strips of equal-size frames: width = w x frames, height = h.
 * The `prompt` field is ready to paste into Gemini.
 */

export interface SpriteAsset {
  key: string;
  w: number;
  h: number;
  frames: number;
  description: string;
  /** Extra character reference for the prompt (appearance details). */
  character?: string;
}

export interface AudioAsset {
  key: string;
  kind: 'sfx' | 'music';
  loop: boolean;
  description: string;
}

const MADHU =
  'Madhu, an Indian woman with dark brown skin (#6B4226, shadow #4A2C17) and long black hair (#1A1414, highlight #3A2E2E) in a braid, ' +
  'wearing a hand-knit mustard cardigan (#D9A43A) over a teal top (#2F8C8C), blue jeans and brown boots';
const IROH = 'Iroh, a big round orange tabby cat (#E8892B, stripes #B85E1A, cream #F6D7A7) with amber eyes; the tip of his left ear is snipped';
const MANGO = 'Mango, a small slim orange tabby cat (#E8892B, stripes #B85E1A) with a lighter cream muzzle and light-green eyes';
const MERINO = 'a Merino sheep with a light face and very fine, dense white fleece (#FFF8EC, shade #E6DCCB)';

const dirs = ['down', 'up', 'left', 'right'] as const;

export const SPRITES: SpriteAsset[] = [
  ...dirs.map((d) => ({
    key: `char_madhu_walk_${d}`, w: 16, h: 24, frames: 4,
    description: `Madhu walking, facing ${d}, 4-frame walk cycle`, character: MADHU,
  })),
  ...dirs.map((d) => ({
    key: `char_madhu_idle_${d}`, w: 16, h: 24, frames: 2,
    description: `Madhu standing idle, facing ${d}, 2-frame breathing/blink loop`, character: MADHU,
  })),
  ...([0, 1, 2, 3] as const).map((s) => ({
    key: `sheep_merino_stage${s}`, w: 24, h: 20, frames: 2,
    description: `${MERINO}, side view facing right, ${['freshly shorn', 'one-third fleece', 'two-thirds fleece', 'full, extra-fluffy fleece'][s]}; frame 1 standing, frame 2 head down grazing`,
  })),
  { key: 'cat_iroh_idle', w: 16, h: 12, frames: 2, description: 'Iroh sitting facing the viewer; frame 2 blinks', character: IROH },
  { key: 'cat_iroh_sleep', w: 16, h: 12, frames: 2, description: 'Iroh curled up asleep in a loaf, gentle breathing', character: IROH },
  { key: 'cat_mango_idle', w: 16, h: 12, frames: 2, description: 'Mango sitting facing the viewer; frame 2 blinks', character: MANGO },
  { key: 'cat_mango_sleep', w: 16, h: 12, frames: 2, description: 'Mango curled up asleep, gentle breathing', character: MANGO },
  { key: 'tile_grass', w: 16, h: 16, frames: 1, description: 'seamless tiling grass ground tile with small tufts' },
  { key: 'tile_grass_b', w: 16, h: 16, frames: 1, description: 'second seamless grass tile variant' },
  { key: 'tile_dirt_path', w: 16, h: 16, frames: 1, description: 'seamless packed dirt path tile' },
  { key: 'tile_wood_floor', w: 16, h: 16, frames: 1, description: 'seamless warm wooden plank floor tile' },
  { key: 'tile_wall_cream', w: 16, h: 16, frames: 1, description: 'seamless cream striped wallpaper tile' },
  { key: 'tile_wall_teal', w: 16, h: 16, frames: 1, description: 'seamless soft teal striped wallpaper tile' },
  { key: 'tile_wall_rose', w: 16, h: 16, frames: 1, description: 'seamless dusty rose striped wallpaper tile' },
  { key: 'tile_wall_lavender', w: 16, h: 16, frames: 1, description: 'seamless lavender striped wallpaper tile' },
  { key: 'tile_fence', w: 16, h: 16, frames: 1, description: 'wooden pasture fence segment that tiles horizontally' },
  { key: 'prop_window', w: 24, h: 20, frames: 1, description: 'cozy wooden-framed window showing sky and grass' },
  { key: 'icon_ranch', w: 16, h: 16, frames: 1, description: 'icon: a fluffy sheep face' },
  { key: 'icon_workshop', w: 16, h: 16, frames: 1, description: 'icon: a wooden spinning wheel' },
  { key: 'icon_dye', w: 16, h: 16, frames: 1, description: 'icon: a steaming dye pot' },
  { key: 'icon_shop', w: 16, h: 16, frames: 1, description: 'icon: a little storefront with a striped awning' },
  { key: 'icon_stash', w: 16, h: 16, frames: 1, description: 'icon: a ball of teal yarn' },
  { key: 'icon_collection', w: 16, h: 16, frames: 1, description: 'icon: an open book' },
  { key: 'icon_settings', w: 16, h: 16, frames: 1, description: 'icon: a small gear' },
];

export const AUDIO: AudioAsset[] = [
  ...(
    [
      ['shear_snip', 'a crisp snip of shears'],
      ['fleece_drop', 'a soft fleece landing on a table'],
      ['water_slosh', 'gentle water slosh in a tub'],
      ['card_brush', 'hand cards brushing wool'],
      ['wheel_whir', 'a spinning wheel whirring (loop)'],
      ['treadle_tap', 'a wooden treadle tap'],
      ['ply_twist', 'yarn twisting together'],
      ['niddy_wrap', 'yarn wrapping onto a niddy-noddy'],
      ['thwack', 'a wet skein being thwacked'],
      ['dye_pour', 'dye poured into a pot'],
      ['dye_bubble', 'a dye pot gently bubbling (loop)'],
      ['speckle_sprinkle', 'dye powder sprinkled'],
      ['shop_bell', 'a shop door bell'],
      ['coin', 'a coin'],
      ['purr', 'a cat purring'],
      ['meow_iroh', 'a low, sleepy meow'],
      ['meow_mango', 'a high, chirpy meow'],
      ['sheep_baa', 'a sheep baa'],
      ['page_turn', 'a page turning'],
      ['ui_tap', 'a soft UI tap'],
      ['achievement_chime', 'a happy chime'],
      ['felt_oops', 'a gentle "oops" sound'],
    ] as const
  ).map(([key, description]) => ({ key, kind: 'sfx' as const, loop: key === 'wheel_whir' || key === 'dye_bubble', description })),
  ...[
    'title_theme', 'ranch_spring', 'ranch_summer', 'ranch_autumn', 'ranch_winter', 'workshop',
    'dye_studio', 'shop_day', 'shop_evening', 'knitting_circle', 'night',
  ].map((key) => ({ key, kind: 'music' as const, loop: true, description: `music loop: ${key.replace(/_/g, ' ')}` })),
];

/** The Gemini prompt template from the design doc, filled in for one sprite. */
export function geminiPrompt(a: SpriteAsset): string {
  return (
    `Pixel art sprite, ${a.w}x${a.h} pixels, ${a.frames} frame${a.frames > 1 ? 's' : ''} in a single horizontal strip, ` +
    `cozy 16-bit farming game style, warm dark-brown outlines, limited palette, flat solid magenta (#FF00FF) background, no text. ` +
    `Subject: ${a.description}.` + (a.character ? ` Character reference: ${a.character}.` : '')
  );
}

export function sunoPrompt(a: AudioAsset): string {
  return `gentle cozy lo-fi acoustic instrumental, ${a.key.replace(/_/g, ' ')} mood, soft guitar, light piano, warm, seamless loop, no vocals`;
}
