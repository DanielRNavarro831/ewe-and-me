import Phaser from 'phaser';
import { SPRITES } from '../data/assets';
import { preloadOverrides, registerSprites } from '../systems/assets';

/** Loads override art, builds placeholder textures and animations, then hands off. */
export class BootScene extends Phaser.Scene {
  constructor(private onReady: (scene: Phaser.Scene) => void) {
    super('Boot');
  }

  preload(): void {
    preloadOverrides(this);
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] could not load ${file.src}; using the placeholder`);
    });
  }

  create(): void {
    registerSprites(this);
    for (const a of SPRITES) {
      if (a.frames < 2) continue;
      const walk = a.key.includes('_walk_');
      this.anims.create({
        key: a.key,
        frames: this.anims.generateFrameNumbers(a.key, { start: 0, end: a.frames - 1 }),
        frameRate: walk ? 7 : a.key.startsWith('sheep') ? 0.6 : 1.2,
        repeat: -1,
        repeatDelay: walk ? 0 : 1500,
      });
    }
    this.onReady(this);
  }
}
