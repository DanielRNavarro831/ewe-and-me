import type Phaser from 'phaser';
import { game } from '../game';
import { exportCode, importCode, downloadBackup, isPersisted } from '../systems/save';
import { SAVE_VERSION } from '../systems/state';
import { SPRITES, AUDIO, geminiPrompt, sunoPrompt } from '../data/assets';
import { assetStatus, spriteDataUrl } from '../systems/assets';
import { playSfx } from '../systems/audio';
import { canInstall, promptInstall } from './install';
import { openModal, el, toast } from './modal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function section(title: string, ...children: (Node | string)[]): HTMLElement {
  return el('div', { className: 'section' }, [el('h3', { textContent: title }), ...children]);
}

function button(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const b = el('button', { className, textContent: label });
  b.addEventListener('click', () => {
    playSfx('ui_tap');
    onClick();
  });
  return b;
}

function slider(label: string, value: number, onInput: (v: number) => void): HTMLElement {
  const input = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)) });
  input.addEventListener('input', () => onInput(Number(input.value) / 100));
  input.addEventListener('change', () => playSfx('ui_tap'));
  return el('label', { className: 'row' }, [el('span', { textContent: label }), input]);
}

function select(label: string, options: [string, string][], value: string, onChange: (v: string) => void): HTMLElement {
  const s = el('select');
  for (const [v, text] of options) s.append(el('option', { value: v, textContent: text, selected: v === value }));
  s.addEventListener('change', () => onChange(s.value));
  return el('label', { className: 'row' }, [el('span', { textContent: label }), s]);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function fmtDuration(ms: number): string {
  const h = Math.round(ms / 36e5);
  if (h === 0) return 'none';
  return h % 24 === 0 ? `+${h / 24} day${h === 24 ? '' : 's'}` : `+${h} h`;
}

export function openSettings(phaser: Phaser.Game): void {
  openModal('Settings', (body) => {
    const s = game.state.settings;

    // Sound
    body.append(
      section(
        'Sound',
        slider('Music', s.musicVolume, (v) => {
          s.musicVolume = v;
          game.changed();
        }),
        slider('Sound effects', s.sfxVolume, (v) => {
          s.sfxVolume = v;
          game.changed();
        }),
      ),
    );

    // Calendar
    body.append(
      section(
        'Calendar',
        select('Seasons', [['north', 'Northern Hemisphere'], ['south', 'Southern Hemisphere']], s.hemisphere, (v) => {
          s.hemisphere = v as 'north' | 'south';
          game.changed();
        }),
        select('Knitting circle', DAYS.map((d, i) => [String(i), d]), String(s.knittingCircleDay), (v) => {
          s.knittingCircleDay = Number(v);
          game.changed();
        }),
      ),
    );

    // Backup
    const code = el('textarea', { className: 'code', readOnly: true, rows: 3 });
    const exportBox = el('div', { className: 'stack hidden' }, [
      el('p', { className: 'hint', textContent: 'Keep this code somewhere safe (a note or an email to yourself). It contains the whole game.' }),
      code,
      el('div', { className: 'btn-row' }, [
        button('Copy code', async () => toast((await copyText(code.value)) ? 'Backup code copied' : 'Select the code and copy it by hand')),
        button('Download file', () => downloadBackup(game.state)),
      ]),
    ]);
    const importArea = el('textarea', { className: 'code', rows: 3, placeholder: 'Paste a backup code here…' });
    const fileInput = el('input', { type: 'file', accept: '.json,application/json,text/plain', className: 'hidden' });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (f) importArea.value = await f.text();
    });
    const importBox = el('div', { className: 'stack hidden' }, [
      importArea,
      el('div', { className: 'btn-row' }, [
        button('Choose file…', () => fileInput.click()),
        button(
          'Restore',
          async () => {
            let restored;
            try {
              restored = importCode(importArea.value);
            } catch (err) {
              toast((err as Error).message, 4000);
              return;
            }
            const when = new Date(restored.lastSeenAt).toLocaleString();
            if (!confirm(`Replace the current game with this backup (last played ${when})? Your current game will be overwritten.`)) return;
            await game.replace(restored);
            location.reload();
          },
          'btn primary',
        ),
      ]),
      fileInput,
    ]);
    body.append(
      section(
        'Backup',
        el('p', { className: 'hint', textContent: 'Export a backup before installing each update.' }),
        el('div', { className: 'btn-row' }, [
          button('Export backup', () => {
            code.value = exportCode(game.state);
            exportBox.classList.remove('hidden');
            importBox.classList.add('hidden');
          }),
          button('Import backup', () => {
            importBox.classList.remove('hidden');
            exportBox.classList.add('hidden');
          }),
        ]),
        exportBox,
        importBox,
      ),
    );

    // Save info
    const info = el('dl', { className: 'info' });
    const fillInfo = async () => {
      const st = game.state;
      const rows: [string, string][] = [
        ['Started', new Date(st.createdAt).toLocaleDateString()],
        ['Times opened', String(st.stats.launches)],
        ['Last saved', game.lastSavedAt ? new Date(game.lastSavedAt).toLocaleTimeString() : '—'],
        ['Protected storage', (await isPersisted()) ? 'Yes' : 'Not yet (install the app to enable)'],
        ['Save format', `v${SAVE_VERSION}`],
        ['Game version', __APP_VERSION__],
      ];
      info.innerHTML = '';
      for (const [k, v] of rows) info.append(el('dt', { textContent: k }), el('dd', { textContent: v }));
    };
    void fillInfo();
    const extras: Node[] = [info];
    if (canInstall()) extras.push(button('Install on this phone', () => void promptInstall(), 'btn primary'));
    body.append(section('Your game', ...extras));

    // Developer tools (for Daniel)
    const offsetLabel = el('span', { className: 'hint' });
    const showOffset = () => (offsetLabel.textContent = `Time offset: ${fmtDuration(game.state.settings.debugTimeOffsetMs)}`);
    showOffset();
    const bump = (ms: number) => () => {
      game.setDebugOffset(ms === 0 ? 0 : game.state.settings.debugTimeOffsetMs + ms);
      showOffset();
    };
    const dev = el('details', { className: 'dev' }, [
      el('summary', { textContent: 'Developer tools' }),
      el('p', { className: 'hint', textContent: 'Fast-forward the game clock to test growth and daily events.' }),
      offsetLabel,
      el('div', { className: 'btn-row' }, [
        button('+1 hour', bump(36e5)),
        button('+4 hours', bump(4 * 36e5)),
        button('+1 day', bump(24 * 36e5)),
        button('Reset', bump(0)),
      ]),
      button('Asset checklist', () => openAssetList(phaser)),
    ]);
    body.append(section('', dev));
  });
}

function openAssetList(phaser: Phaser.Game): void {
  const boot = phaser.scene.getScene('Boot');
  openModal('Asset checklist', (body) => {
    const spritesDone = SPRITES.filter((a) => assetStatus.get(a.key) === 'override').length;
    const audioDone = AUDIO.filter((a) => assetStatus.get(`${a.kind}:${a.key}`) === 'override').length;
    body.append(
      el('p', {
        className: 'hint',
        textContent:
          `Sprites replaced: ${spritesDone} of ${SPRITES.length}. Audio replaced: ${audioDone} of ${AUDIO.length}. ` +
          'Drop a file named after the key into public/assets/… and redeploy. Tap “Copy prompt” for a ready-made Gemini or Suno prompt.',
      }),
    );
    const list = el('ul', { className: 'assets' });
    for (const a of SPRITES) {
      const status = assetStatus.get(a.key) ?? 'missing';
      const li = el('li', {}, [
        el('img', { src: spriteDataUrl(boot, a.key, 2), alt: '' }),
        el('div', {}, [
          el('code', { textContent: a.key }),
          el('small', { textContent: `${a.w}×${a.h}, ${a.frames} frame${a.frames > 1 ? 's' : ''} → sprites/${a.key}.png` }),
        ]),
        el('span', { className: `badge ${status}`, textContent: status === 'override' ? 'Replaced' : 'Placeholder' }),
        button('Copy prompt', async () => toast((await copyText(geminiPrompt(a))) ? 'Gemini prompt copied' : 'Could not copy'), 'btn small'),
      ]);
      list.append(li);
    }
    for (const a of AUDIO) {
      const status = assetStatus.get(`${a.kind}:${a.key}`) ?? 'placeholder';
      list.append(
        el('li', {}, [
          el('span', { className: 'audio-icon', textContent: a.kind === 'music' ? '♪' : '🔊' }),
          el('div', {}, [el('code', { textContent: a.key }), el('small', { textContent: `audio/${a.kind}/${a.key}.mp3` })]),
          el('span', { className: `badge ${status}`, textContent: status === 'override' ? 'Replaced' : 'Placeholder' }),
          a.kind === 'music'
            ? button('Copy prompt', async () => toast((await copyText(sunoPrompt(a))) ? 'Suno prompt copied' : 'Could not copy'), 'btn small')
            : el('span'),
        ]),
      );
    }
    body.append(list);
  });
}
