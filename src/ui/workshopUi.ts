import { game } from '../game';
import type { FiberItem, FiberKind, Yarn } from '../systems/state';
import { breed, naturalColor } from '../data/breeds';
import { WHORLS, weightForWpi, YARN_WEIGHTS } from '../data/yarnWeights';
import { fiberName, frog, KIND_NAMES, yarnName, type SpinSetup } from '../systems/workshop';
import { gradeOf } from '../systems/quality';
import { unlock } from '../systems/achievements';
import { playSfx } from '../systems/audio';
import { openModal, el, toast } from './modal';
import { isOnShelf, priceOf } from '../systems/economy';
import { isDrying, swatchCss } from '../systems/dye';
import { formatDuration } from '../systems/ranch';
import { clock } from '../systems/clock';

function btn(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const b = el('button', { className, textContent: label });
  b.addEventListener('click', () => {
    playSfx('ui_tap');
    onClick();
  });
  return b;
}

function swatch(hex: string): HTMLElement {
  const s = el('span', { className: 'swatch' });
  s.style.background = hex;
  return s;
}

function fiberHex(f: { breedId: string; colorId: string }): string {
  return naturalColor(breed(f.breedId), f.colorId).hex;
}

/** One line describing a fiber item, for pickers and the stash. */
export function fiberSummary(f: FiberItem): string {
  const bits = [`${f.grams} g`];
  if (f.kind === 'fleece' || f.kind === 'skirted') bits.push(`${f.stapleCm} cm staple`);
  if (f.wpi) bits.push(`${f.wpi} WPI`);
  if (f.evenness !== undefined) bits.push(`evenness ${f.evenness}`);
  if (f.plyBalance !== undefined) bits.push(`ply balance ${f.plyBalance}`);
  bits.push(`${gradeOf(f.score)} (${f.score})`);
  bits.push(`from ${f.from}`);
  return bits.join(' · ') + (f.tags.length ? ` · ${f.tags.join(', ')}` : '');
}

/** Station picker: choose which item to work on next. */
export function openStationPicker(opts: {
  title: string;
  intro: string;
  items: FiberItem[];
  action: string;
  empty: string;
  onPick: (f: FiberItem) => void;
}): void {
  openModal(opts.title, (body, close) => {
    body.append(el('p', { className: 'hint', textContent: opts.intro }));
    if (!opts.items.length) {
      body.append(el('p', { className: 'stat', textContent: opts.empty }));
      return;
    }
    const ul = el('ul', { className: 'items' });
    for (const f of opts.items) {
      ul.append(
        el('li', {}, [
          swatch(fiberHex(f)),
          el('div', {}, [el('strong', { textContent: fiberName(f) }), el('small', { textContent: fiberSummary(f) })]),
          btn(opts.action, () => {
            close();
            opts.onPick(f);
          }, 'btn primary small'),
        ]),
      );
    }
    body.append(ul);
  });
}

function choiceGroup<T extends string>(options: [T, string][], value: T, onChange: (v: T) => void): HTMLElement {
  const g = el('div', { className: 'choice-group' });
  const buttons: HTMLButtonElement[] = [];
  for (const [v, label] of options) {
    const b = el('button', { className: `btn${v === value ? ' selected' : ''}`, textContent: label });
    b.addEventListener('click', () => {
      playSfx('ui_tap');
      buttons.forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      onChange(v);
    });
    buttons.push(b);
    g.append(b);
  }
  return g;
}

/** Before spinning: drafting style, whorl ratio, how much to spin, art yarn. */
export function openSpinSetup(f: FiberItem, onStart: (setup: SpinSetup) => void): void {
  const setup: SpinSetup = { style: f.kind === 'rolags' ? 'long' : 'short', whorl: 'medium', portion: 0.5, art: false };
  openModal(`Spin ${fiberName(f)}`, (body, close) => {
    body.append(el('p', { className: 'hint', textContent: `${f.grams} g ready at the wheel.` }));
    const section = (title: string, node: HTMLElement, note?: string) =>
      el('div', { className: 'section' }, [el('h3', { textContent: title }), node, ...(note ? [el('p', { className: 'hint', textContent: note })] : [])]);

    body.append(
      section(
        'Drafting',
        choiceGroup(
          [
            ['long', 'Long draw (woolen)'],
            ['short', 'Short forward draw (worsted)'],
          ],
          setup.style,
          (v) => (setup.style = v),
        ),
        f.kind === 'rolags' ? 'Rolags are made for a long draw: lofty, airy woolen yarn.' : undefined,
      ),
      section(
        'Whorl ratio',
        choiceGroup(
          WHORLS.map((w) => [w.id, w.label] as [typeof w.id, string]),
          setup.whorl,
          (v) => (setup.whorl = v),
        ),
      ),
      section(
        'How much onto this bobbin',
        choiceGroup(
          [
            ['0.5', 'Half (for a 2-ply)'],
            ['0.34', 'A third (for a 3-ply)'],
            ['1', 'All of it'],
          ],
          '0.5',
          (v) => (setup.portion = Number(v)),
        ),
        'Spin the rest onto another bobbin, then ply them together. Spin it all for singles or a chain-ply.',
      ),
      section(
        'Style',
        choiceGroup(
          [
            ['even', 'Even singles'],
            ['art', 'Art yarn (thick-and-thin)'],
          ],
          'even',
          (v) => (setup.art = v === 'art'),
        ),
      ),
      el('div', { className: 'btn-row' }, [
        btn('Start spinning', () => {
          close();
          onStart(setup);
        }, 'btn primary'),
      ]),
    );
  });
}

/** At the wheel: spin prepared fiber, or ply bobbins of singles. */
export function openWheelMenu(prepared: FiberItem[], singles: FiberItem[], actions: { spin: (f: FiberItem) => void; ply: (ids: string[], chain: boolean) => void }): void {
  openModal('Spinning wheel', (body, close) => {
    body.append(el('h3', { className: 'sub', textContent: 'Spin' }));
    if (!prepared.length) body.append(el('p', { className: 'hint', textContent: 'No prepared fiber yet. Card some clean wool into rolags first.' }));
    else {
      const ul = el('ul', { className: 'items' });
      for (const f of prepared) {
        ul.append(
          el('li', {}, [
            swatch(fiberHex(f)),
            el('div', {}, [el('strong', { textContent: fiberName(f) }), el('small', { textContent: fiberSummary(f) })]),
            btn('Spin', () => {
              close();
              actions.spin(f);
            }, 'btn primary small'),
          ]),
        );
      }
      body.append(ul);
    }

    body.append(el('h3', { className: 'sub', textContent: 'Ply' }));
    if (!singles.length) {
      body.append(el('p', { className: 'hint', textContent: 'No bobbins of singles yet.' }));
      return;
    }
    body.append(el('p', { className: 'hint', textContent: 'Pick 2 or 3 bobbins for the lazy kate, or 1 bobbin to chain-ply.' }));
    const chosen = new Set<string>();
    const ul = el('ul', { className: 'items' });
    const go = el('button', { className: 'btn primary', textContent: 'Ply' });
    const refresh = () => {
      const n = chosen.size;
      go.disabled = n < 1 || n > 3;
      go.textContent = n === 1 ? 'Chain-ply this bobbin' : n >= 2 && n <= 3 ? `Ply ${n} bobbins` : 'Choose bobbins';
    };
    for (const f of singles) {
      const cb = el('input', { type: 'checkbox' });
      cb.addEventListener('change', () => {
        if (cb.checked) chosen.add(f.id);
        else chosen.delete(f.id);
        refresh();
      });
      ul.append(
        el('li', {}, [
          swatch(fiberHex(f)),
          el('div', {}, [el('strong', { textContent: fiberName(f) }), el('small', { textContent: fiberSummary(f) })]),
          el('label', { className: 'check' }, [cb]),
        ]),
      );
    }
    go.addEventListener('click', () => {
      if (chosen.size < 1 || chosen.size > 3) return;
      close();
      actions.ply([...chosen], chosen.size === 1);
    });
    refresh();
    body.append(ul, el('div', { className: 'btn-row' }, [go]));
    body.append(el('p', { className: 'hint', textContent: 'Singles can also go straight to the niddy-noddy to finish as singles.' }));
  });
}

/* ---------- Stash ---------- */

type StashFilter = 'yarn' | 'fiber';

const STAGE_ORDER: FiberKind[] = ['fleece', 'skirted', 'clean', 'felt', 'rolags', 'top', 'singles', 'plied'];

const NEXT_STEP: Partial<Record<FiberKind, string>> = {
  fleece: 'Next: the skirting table',
  skirted: 'Next: the wash tubs',
  clean: 'Next: the hand cards',
  felt: 'Saved for felting projects',
  rolags: 'Next: the spinning wheel',
  singles: 'Next: ply at the wheel, or finish as singles',
  plied: 'Next: the niddy-noddy',
};

/** Every fiber and yarn Madhu owns, filterable by stage, fiber and weight. */
export function openStash(filter: StashFilter = 'yarn'): void {
  openModal('Stash', (body) => {
    const s = game.state;
    let mode: StashFilter = filter;
    let weight = 'all';
    let breedFilter = 'all';
    const list = el('div', {});

    const totals = el('p', { className: 'hint' });
    const yardTotal = s.yarns.reduce((a, y) => a + y.yards, 0);
    totals.textContent = `${s.yarns.length} skein${s.yarns.length === 1 ? '' : 's'} (${yardTotal} yards) · ${s.fiber.length} fiber item${s.fiber.length === 1 ? '' : 's'}`;

    const weightSel = el('select');
    weightSel.append(el('option', { value: 'all', textContent: 'All weights' }));
    for (const w of YARN_WEIGHTS) weightSel.append(el('option', { value: w.id, textContent: w.name }));
    weightSel.addEventListener('change', () => {
      weight = weightSel.value;
      render();
    });
    const breedSel = el('select');
    breedSel.append(el('option', { value: 'all', textContent: 'All fibers' }));
    for (const id of new Set([...s.yarns.map((y) => y.breedId), ...s.fiber.map((f) => f.breedId)])) {
      breedSel.append(el('option', { value: id, textContent: breed(id).name }));
    }
    breedSel.addEventListener('change', () => {
      breedFilter = breedSel.value;
      render();
    });

    const tabs = choiceGroup(
      [
        ['yarn', 'Skeins'],
        ['fiber', 'Fiber in progress'],
      ],
      mode,
      (v) => {
        mode = v;
        weightSel.disabled = v === 'fiber';
        render();
      },
    );

    const render = () => {
      list.innerHTML = '';
      if (mode === 'yarn') {
        const ys = s.yarns.filter((y) => (weight === 'all' || y.weightId === weight) && (breedFilter === 'all' || y.breedId === breedFilter));
        if (!ys.length) {
          list.append(el('p', { className: 'stat', textContent: s.yarns.length ? 'No skeins match.' : 'No skeins yet. Finish a bobbin at the niddy-noddy.' }));
          return;
        }
        const ul = el('ul', { className: 'items' });
        for (const y of [...ys].reverse()) ul.append(yarnRow(y, render));
        list.append(ul);
      } else {
        const fs = s.fiber
          .filter((f) => breedFilter === 'all' || f.breedId === breedFilter)
          .sort((a, b) => STAGE_ORDER.indexOf(a.kind) - STAGE_ORDER.indexOf(b.kind));
        if (!fs.length) {
          list.append(el('p', { className: 'stat', textContent: 'No fiber in progress. Shear a sheep at the Ranch.' }));
          return;
        }
        const ul = el('ul', { className: 'items' });
        for (const f of fs) {
          ul.append(
            el('li', {}, [
              swatch(fiberHex(f)),
              el('div', {}, [
                el('strong', { textContent: `${KIND_NAMES[f.kind]}: ${fiberName(f)}` }),
                el('small', { textContent: fiberSummary(f) }),
                el('small', { className: 'next', textContent: NEXT_STEP[f.kind] ?? '' }),
              ]),
            ]),
          );
        }
        list.append(ul);
      }
    };

    weightSel.disabled = mode === 'fiber';
    body.append(totals, tabs, el('div', { className: 'btn-row' }, [breedSel, weightSel]), list);
    render();
  });
}

function yarnRow(y: Yarn, rerender: () => void): HTMLElement {
  const details = [
    `${y.grams} g · ${y.yards} yd`,
    `${y.wpi} WPI ${weightForWpi(y.wpi).name}`,
    y.prep,
    y.plyBalance !== null ? `ply balance ${y.plyBalance}${y.balanced ? ' (balanced)' : ''}` : 'singles',
    `evenness ${y.evenness}`,
    y.dye ? `${y.dye.technique}, lot ${y.dye.lot}` : 'undyed',
    ...(y.tags.length ? [y.tags.join(', ')] : []),
    `made ${new Date(y.madeAt).toLocaleDateString()}`,
  ];
  const drying = isDrying(y);
  const frogBtn = btn('Frog it', () => {
    if (!confirm(`Rip ${yarnName(y)} back to fiber? You'll get the rolags back to spin again.`)) return;
    frog(game.state, y);
    game.changed();
    toast('Ribbit. Back to rolags.');
    if (game.state.stats.frogged >= 10) unlock('frog_pond');
    rerender();
  }, 'btn small');
  const onShelf = isOnShelf(game.state, y.id);
  const status = onShelf
    ? `On a shop shelf · $${priceOf(y, game.state).price}`
    : drying
      ? `Drying on the rack · ready in ${formatDuration((y.dryingUntil ?? 0) - clock.now())}`
      : '';
  const sw = el('span', { className: 'swatch' });
  sw.style.background = swatchCss(y);
  return el('li', {}, [
    sw,
    el('div', {}, [
      el('strong', { textContent: yarnName(y) }),
      el('small', { textContent: details.join(' · ') }),
      el('span', { className: `grade ${y.grade.toLowerCase()}`, textContent: `${y.grade} (${y.score})` }),
      ...(status ? [el('small', { className: 'next', textContent: status })] : []),
    ]),
    // dyed skeins can't be ripped back to undyed fiber
    onShelf || drying || y.dye ? el('span') : frogBtn,
  ]);
}
