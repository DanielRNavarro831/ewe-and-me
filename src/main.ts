import Phaser from 'phaser';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './ui/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { game } from './game';
import { computeLayout } from './layout';
import { BootScene } from './scenes/Boot';
import { ROOMS } from './scenes/rooms';
import { ShearScene } from './minigames/Shear';
import { buildHud, updateHud } from './ui/hud';
import { unlockAudio } from './systems/audio';
import type { SceneKey } from './systems/state';
import './ui/install';

registerSW({ immediate: true });

const stage = document.getElementById('stage')!;
const wrap = document.getElementById('game')!;

function fit(): ReturnType<typeof computeLayout> {
  const layout = computeLayout(stage.clientWidth, stage.clientHeight);
  wrap.style.width = `${layout.cssWidth}px`;
  wrap.style.height = `${layout.cssHeight}px`;
  return layout;
}

async function start(): Promise<void> {
  await game.init();
  const layout = fit();

  const phaser = new Phaser.Game({
    type: Phaser.AUTO,
    parent: wrap,
    width: layout.width,
    height: layout.height,
    backgroundColor: '#2B1E1E',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 3 },
    scene: [],
  });

  if (import.meta.env.DEV) Object.assign(window, { __ewe: { phaser, game } });

  const switchTo = (key: SceneKey) => {
    // Stop every other room or minigame (including one that is still starting), but never Boot.
    for (const s of phaser.scene.getScenes(false)) {
      const k = s.sys.settings.key;
      if (k !== 'Boot' && k !== key) phaser.scene.stop(k);
    }
    if (phaser.scene.isActive(key)) phaser.scene.stop(key);
    game.state.currentScene = key;
    phaser.scene.start(key);
    game.changed();
    updateHud();
  };

  phaser.scene.add(
    'Boot',
    new BootScene((boot) => {
      for (const Room of ROOMS) {
        const room = new Room();
        phaser.scene.add(room.sys.settings.key, room, false);
      }
      phaser.scene.add('Shear', new ShearScene(), false);
      buildHud(phaser, boot, switchTo);
      phaser.scene.start(game.state.currentScene);
      document.getElementById('loading')?.remove();
    }),
    true,
  );

  // Refit whenever the play area changes size (rotation, browser resize, bars appearing).
  let resizeTimer = 0;
  let lastKey = '';
  new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const l = fit();
      const key = `${l.width}x${l.height}`;
      if (key !== lastKey) {
        lastKey = key;
        phaser.scale.resize(l.width, l.height);
      }
      phaser.scale.refresh();
    }, 100);
  }).observe(stage);

  window.addEventListener('pointerdown', unlockAudio, { once: true });
}

start().catch((err) => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Something went wrong while loading. Please reopen the app.';
});
