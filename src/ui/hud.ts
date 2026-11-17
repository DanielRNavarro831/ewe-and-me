import type Phaser from 'phaser';
import { game } from '../game';
import type { SceneKey } from '../systems/state';
import { clock, seasonOf } from '../systems/clock';
import { spriteDataUrl } from '../systems/assets';
import { playSfx } from '../systems/audio';
import { openSettings } from './settings';

export const TABS: { key: SceneKey; label: string; icon: string }[] = [
  { key: 'Ranch', label: 'Ranch', icon: 'icon_ranch' },
  { key: 'Workshop', label: 'Workshop', icon: 'icon_workshop' },
  { key: 'DyeStudio', label: 'Dye', icon: 'icon_dye' },
  { key: 'Shop', label: 'Shop', icon: 'icon_shop' },
  { key: 'Stash', label: 'Stash', icon: 'icon_stash' },
  { key: 'Collection', label: 'Book', icon: 'icon_collection' },
];

const ROOM_NAMES: Record<SceneKey, string> = {
  Ranch: 'The Ranch',
  Workshop: 'Workshop',
  DyeStudio: 'Dye Studio',
  Shop: 'The Shop',
  Stash: 'Stash',
  Collection: 'Collection',
};

const SEASON_EMOJI = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' } as const;

let switchScene: (key: SceneKey) => void = () => {};
let titleOverride: string | null = null;

/** Shows a different title in the top bar while a minigame is open (null to restore). */
export function setTitleOverride(title: string | null): void {
  titleOverride = title;
  updateHud();
}

/** Clears the override only if it's still the given title (another scene may have set its own). */
export function clearTitleOverride(title: string): void {
  if (titleOverride === title) setTitleOverride(null);
}

export function buildHud(phaser: Phaser.Game, boot: Phaser.Scene, onSwitch: (key: SceneKey) => void): void {
  switchScene = onSwitch;
  const tabbar = document.getElementById('tabbar')!;
  tabbar.innerHTML = '';
  for (const t of TABS) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.dataset.key = t.key;
    b.setAttribute('aria-label', t.label);
    b.innerHTML = `<img alt="" src="${spriteDataUrl(boot, t.icon)}"><span>${t.label}</span>`;
    b.addEventListener('click', () => {
      // Tapping the current room's tab does nothing, unless a minigame is covering it.
      if (game.state.currentScene === t.key && phaser.scene.isActive(t.key)) return;
      playSfx('page_turn');
      switchScene(t.key);
    });
    tabbar.appendChild(b);
  }

  const gear = document.getElementById('settings-btn')!;
  gear.innerHTML = `<img alt="Settings" src="${spriteDataUrl(boot, 'icon_settings')}">`;
  gear.addEventListener('click', () => {
    playSfx('ui_tap');
    openSettings(phaser);
  });

  updateHud();
  window.setInterval(updateHud, 10_000);
  game.onChange(updateHud);
}

export function updateHud(): void {
  const s = game.state;
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.key === s.currentScene);
  });
  const name = document.getElementById('room-name')!;
  name.textContent = titleOverride ?? ROOM_NAMES[s.currentScene];
  const d = clock.date();
  const season = seasonOf(d, s.settings.hemisphere);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const day = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('clock')!.textContent = `${SEASON_EMOJI[season]} ${day} · ${time}`;
  document.getElementById('money')!.textContent = `$${s.money}`;
}
