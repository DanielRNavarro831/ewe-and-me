import { game } from '../game';
import type { Animal } from '../systems/state';
import { breed, naturalColor } from '../data/breeds';
import { SHEEP_NAMES } from '../data/names';
import {
  canShear, dayKey, fleeceStage, formatDuration, hayInTrough, msUntilGrowth, SHEAR_FROM, STAGE_NAMES, stapleCm, tickAnimal,
} from '../systems/ranch';
import { playSfx } from '../systems/audio';
import { openModal, el } from './modal';

function btn(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const b = el('button', { className, textContent: label });
  b.addEventListener('click', () => {
    playSfx('ui_tap');
    onClick();
  });
  return b;
}

function bar(fraction: number, color: string, label: string): HTMLElement {
  const outer = el('div', { className: 'bar' });
  outer.setAttribute('role', 'meter');
  outer.setAttribute('aria-label', label);
  outer.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
  const inner = el('div', { className: 'bar-fill' });
  inner.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  inner.style.background = color;
  outer.append(inner);
  return outer;
}

function suggestName(): string {
  const used = new Set(game.state.animals.map((a) => a.name));
  const free = SHEEP_NAMES.filter((n) => !used.has(n));
  const pool = free.length ? free : SHEEP_NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Asks Madhu to name an animal, offering a suggestion she can accept or shuffle. */
export function openNamePrompt(a: Animal, onDone: () => void): void {
  const b = breed(a.breedId);
  openModal(a.name ? `Rename ${a.name}` : 'A new friend', (body, close) => {
    const color = naturalColor(b, a.colorId).name.toLowerCase();
    body.append(
      el('p', {
        className: 'hint',
        textContent: a.name
          ? 'Choose a new name.'
          : `This ${color} ${b.name} ewe is yours to look after. What will you call her?`,
      }),
    );
    const input = el('input', { type: 'text', value: a.name ?? suggestName(), maxLength: 16, className: 'text-input' });
    input.setAttribute('aria-label', 'Name');
    const error = el('p', { className: 'error hidden', textContent: 'Give her a name first.' });
    input.addEventListener('input', () => error.classList.add('hidden'));
    const confirm = () => {
      const name = input.value.trim();
      if (!name) {
        error.classList.remove('hidden');
        return;
      }
      a.name = name;
      game.changed();
      playSfx('sheep_baa');
      close();
      onDone();
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && confirm());
    body.append(
      input,
      error,
      el('div', { className: 'btn-row' }, [
        btn('Suggest another', () => {
          input.value = suggestName();
        }),
        btn(a.name ? 'Save' : "That's her name", confirm, 'btn primary'),
      ]),
    );
  });
}

export interface CardActions {
  onBrush: () => void;
  onShear: () => void;
}

/** The care card shown when Madhu visits an animal. */
export function openAnimalCard(a: Animal, actions: CardActions): void {
  const state = game.state;
  tickAnimal(a, state);
  const b = breed(a.breedId);
  const color = naturalColor(b, a.colorId);
  const today = dayKey();

  openModal(a.name ?? b.name, (body, close) => {
    body.append(
      el('p', { className: 'hint', textContent: `${b.name} · ${color.name} · ${b.micron} micron · ${b.crimp} crimp, ${b.luster} luster` }),
    );

    // Fleece
    const pct = Math.round(a.growth * 100);
    const staple = stapleCm(a).toFixed(1);
    const fleeceLine =
      a.growth >= 1
        ? 'Full fleece. She looks extra fluffy and is happy to wait.'
        : `Full fleece in ${formatDuration(msUntilGrowth(a, state, 1))}.`;
    body.append(
      el('div', { className: 'section' }, [
        el('h3', { textContent: 'Fleece' }),
        bar(a.growth, 'var(--teal)', 'Fleece growth'),
        el('p', { className: 'stat', textContent: `${pct}% · ${STAGE_NAMES[fleeceStage(a.growth)]} · ${staple} cm staple (full ${b.fullStapleCm} cm)` }),
        el('p', { className: 'hint', textContent: fleeceLine }),
      ]),
    );

    // Happiness and care
    const petted = a.lastPetDay === today;
    const brushed = a.lastBrushDay === today;
    const hay = hayInTrough(state);
    body.append(
      el('div', { className: 'section' }, [
        el('h3', { textContent: 'Happiness' }),
        bar(a.happiness / 100, 'var(--rose)', 'Happiness'),
        el('p', { className: 'stat', textContent: `${Math.round(a.happiness)} of 100` }),
        el('ul', { className: 'checklist' }, [
          el('li', { className: petted ? 'done' : '', textContent: petted ? 'Petted today' : 'Not petted yet today' }),
          el('li', { className: brushed ? 'done' : '', textContent: brushed ? 'Brushed today' : 'Not brushed yet today' }),
          el('li', {
            className: hay ? 'done' : '',
            textContent: hay ? 'Hay in the trough' : 'The trough is empty. Tap it to fill it with hay.',
          }),
        ]),
      ]),
    );

    // Actions
    const row = el('div', { className: 'btn-row' });
    if (!brushed)
      row.append(
        btn('Brush', () => {
          close();
          actions.onBrush();
        }),
      );
    if (canShear(a))
      row.append(
        btn(
          'Shear',
          () => {
            close();
            actions.onShear();
          },
          'btn primary',
        ),
      );
    row.append(btn('Rename', () => openNamePrompt(a, () => close())));
    body.append(row);
    if (!canShear(a)) {
      body.append(
        el('p', {
          className: 'hint',
          textContent: `Ready to shear at ${SHEAR_FROM * 100}% growth, in ${formatDuration(msUntilGrowth(a, state, SHEAR_FROM))}.`,
        }),
      );
    }
  });
}
