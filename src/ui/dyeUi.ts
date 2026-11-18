import { game } from '../game';
import type { Colorway } from '../systems/state';
import { DYES, TECHNIQUES } from '../data/dyes';
import { dyeable, isDrying, potCapacity, swatchCss } from '../systems/dye';
import { yarnName } from '../systems/workshop';
import { formatDuration } from '../systems/ranch';
import { clock } from '../systems/clock';
import { playSfx } from '../systems/audio';
import { openModal, el, toast } from './modal';

function swatch(bg: string, big = false): HTMLElement {
  const s = el('span', { className: big ? 'swatch big' : 'swatch' });
  s.style.background = bg;
  return s;
}

export function recipeText(c: Colorway): string {
  const parts = DYES.filter((d) => (c.dos[d.id] ?? 0) > 0).map((d) => `${d.name.toLowerCase()} ${c.dos[d.id].toFixed(2)}%`);
  const tech = TECHNIQUES.find((t) => t.id === c.technique)?.name ?? c.technique;
  return `${tech} · ${parts.join(' + ')} WOF`;
}

/** Choosing skeins for the pot, and whether to repeat a colorway from the book. */
export function openPotLoader(onStart: (yarnIds: string[], colorwayId?: string) => void, preset?: Colorway): void {
  const s = game.state;
  const cap = potCapacity(s);
  openModal(preset ? `Dye ${preset.name}` : 'Load the dye pot', (body, close) => {
    const yarns = dyeable(s);
    if (!yarns.length) {
      body.append(
        el('p', {
          className: 'stat',
          textContent: s.yarns.length
            ? 'No undyed skeins free right now. Skeins on shop shelves stay out of the pot; take one down first.'
            : 'No skeins yet. Finish some yarn in the Workshop.',
        }),
      );
      return;
    }
    body.append(
      el('p', {
        className: 'hint',
        textContent: `The pot holds ${cap} skeins. Skeins dyed together share one dye lot, so dye enough in one batch for a big project.`,
      }),
    );
    if (preset) {
      const head = el('div', { className: 'skein-head' }, [swatch(preset.hex, true), el('div', {}, [el('strong', { textContent: preset.name }), el('small', { textContent: recipeText(preset) })]), el('span')]);
      body.append(head);
    }
    const chosen = new Set<string>();
    const go = el('button', { className: 'btn primary', textContent: 'Choose skeins' });
    const refresh = () => {
      go.disabled = chosen.size === 0;
      go.textContent = chosen.size ? `Dye ${chosen.size} skein${chosen.size > 1 ? 's' : ''}` : 'Choose skeins';
    };
    const ul = el('ul', { className: 'items' });
    const boxes: HTMLInputElement[] = [];
    for (const y of yarns) {
      const cb = el('input', { type: 'checkbox' });
      boxes.push(cb);
      cb.addEventListener('change', () => {
        if (cb.checked && chosen.size >= cap) {
          cb.checked = false;
          toast(`The pot holds ${cap} skeins.`);
          return;
        }
        if (cb.checked) chosen.add(y.id);
        else chosen.delete(y.id);
        refresh();
      });
      ul.append(
        el('li', {}, [
          swatch(swatchCss(y)),
          el('div', {}, [el('strong', { textContent: yarnName(y) }), el('small', { textContent: `${y.grams} g · ${y.yards} yd · ${y.grade}` })]),
          el('label', { className: 'check' }, [cb]),
        ]),
      );
    }
    go.addEventListener('click', () => {
      if (!chosen.size) return;
      playSfx('ui_tap');
      close();
      onStart([...chosen], preset?.id);
    });
    refresh();
    body.append(ul, el('div', { className: 'btn-row' }, [go]));
  });
}

/** The swatch book: every colorway Madhu has named, ready to repeat. */
export function openSwatchBook(onRepeat?: (c: Colorway) => void): void {
  const s = game.state;
  openModal('Swatch book', (body, close) => {
    if (!s.colorways.length) {
      body.append(el('p', { className: 'stat', textContent: 'No colorways yet. Each new recipe you dye is saved here under the name you give it.' }));
      return;
    }
    body.append(el('p', { className: 'hint', textContent: `${s.colorways.length} colorway${s.colorways.length > 1 ? 's' : ''}. Recipes are saved as depth of shade, so they scale to any pot.` }));
    const ul = el('ul', { className: 'swatches' });
    for (const c of [...s.colorways].reverse()) {
      const kids: (Node | string)[] = [
        swatch(c.hex, true),
        el('div', {}, [
          el('strong', { textContent: c.name }),
          el('small', { textContent: recipeText(c) }),
          el('small', { textContent: `${c.lots.length} lot${c.lots.length === 1 ? '' : 's'}: ${c.lots.slice(-4).join(', ')}${c.lots.length > 4 ? '…' : ''}` }),
        ]),
      ];
      if (onRepeat) {
        const b = el('button', { className: 'btn small primary', textContent: 'Dye again' });
        b.addEventListener('click', () => {
          playSfx('page_turn');
          close();
          onRepeat(c);
        });
        kids.push(b);
      } else kids.push(el('span'));
      ul.append(el('li', {}, kids));
    }
    body.append(ul);
  });
}

/** The drying rack: freshly dyed skeins hang here for a short real-time wait. */
export function openDryingRack(): void {
  const s = game.state;
  const now = clock.now();
  openModal('Drying rack', (body) => {
    const drying = s.yarns.filter((y) => isDrying(y, now));
    if (!drying.length) {
      body.append(el('p', { className: 'stat', textContent: 'Nothing drying. Freshly dyed skeins hang here before they join your stash.' }));
      return;
    }
    const ul = el('ul', { className: 'items' });
    for (const y of drying) {
      ul.append(
        el('li', {}, [
          swatch(swatchCss(y)),
          el('div', {}, [el('strong', { textContent: yarnName(y) }), el('small', { textContent: `Lot ${y.dye?.lot} · dry in ${formatDuration((y.dryingUntil ?? now) - now)}` })]),
          el('span'),
        ]),
      );
    }
    body.append(ul);
  });
}
