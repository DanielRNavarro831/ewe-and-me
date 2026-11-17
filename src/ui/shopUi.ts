import { game } from '../game';
import type { Yarn } from '../systems/state';
import { isOnShelf, placeOnShelf, priceOf, setNudge, todaysEarnings, yarnHex, type PriceBreakdown } from '../systems/economy';
import type { AwaySummary } from '../systems/customers';
import { yarnName } from '../systems/workshop';
import { formatDuration } from '../systems/ranch';
import { playSfx } from '../systems/audio';
import { MAX_NUDGE } from '../data/pricing';
import { openModal, el } from './modal';

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

const x = (n: number) => `×${n.toFixed(2).replace(/0$/, '')}`;

function breakdownText(p: PriceBreakdown): string {
  const parts = [
    `$${p.base} per 100 g × ${p.grams} g`,
    `weight ${x(p.weight)}`,
    `quality ${x(p.quality)}`,
    `dye ${x(p.dye)}`,
    `demand ${x(p.demand)}${p.demandWhy.length ? ` (${p.demandWhy.join(', ')})` : ''}`,
  ];
  if (p.balanced > 1) parts.push('balanced ply +5%');
  return parts.join(' · ');
}

/** Tapping a shelf: put a skein out, or adjust or remove the one that's there. */
export function openShelfSlot(slot: number, onChange: () => void): void {
  const s = game.state;
  const yarnId = s.shop.shelf[slot];
  const y = yarnId ? s.yarns.find((v) => v.id === yarnId) : undefined;

  if (y) {
    openModal('On the shelf', (body, close) => {
      const p0 = priceOf(y, s);
      const price = el('strong', { className: 'price', textContent: `$${p0.price}` });
      const slider = el('input', { type: 'range', min: String(-MAX_NUDGE * 100), max: String(MAX_NUDGE * 100), step: '5', value: String(Math.round(p0.nudge * 100)) });
      const nudgeLabel = el('span', {});
      const help = el('p', { className: 'hint' });
      const update = () => {
        const p = priceOf(y, s);
        price.textContent = `$${p.price}`;
        const pct = Math.round(p.nudge * 100);
        nudgeLabel.textContent = pct === 0 ? 'List price' : `${pct > 0 ? '+' : ''}${pct}%`;
        help.textContent =
          pct > 0 ? 'A higher price means customers are less likely to buy.' : pct < 0 ? 'A lower price sells a little more easily.' : 'Customers buy best when a skein matches what they’re looking for.';
      };
      slider.addEventListener('input', () => {
        setNudge(s, y.id, Number(slider.value) / 100);
        update();
      });
      slider.addEventListener('change', () => {
        game.changed();
        onChange();
      });
      update();
      body.append(
        el('div', { className: 'skein-head' }, [swatch(yarnHex(y)), el('div', {}, [el('strong', { textContent: yarnName(y) }), el('small', { textContent: `${y.grams} g · ${y.yards} yd · ${y.grade} (${y.score})` })]), price]),
        el('p', { className: 'hint', textContent: breakdownText(p0) }),
        el('label', { className: 'row' }, [el('span', { textContent: 'Price' }), slider, nudgeLabel]),
        help,
        el('div', { className: 'btn-row' }, [
          btn('Take off the shelf', () => {
            placeOnShelf(s, slot, null);
            game.changed();
            onChange();
            close();
          }),
        ]),
      );
    });
    return;
  }

  openModal('Stock the shelf', (body, close) => {
    const available = s.yarns.filter((v) => !isOnShelf(s, v.id));
    if (!available.length) {
      body.append(
        el('p', {
          className: 'stat',
          textContent: s.yarns.length ? 'Every skein is already out on the shelves.' : 'No skeins yet. Finish some yarn in the Workshop.',
        }),
      );
      return;
    }
    body.append(el('p', { className: 'hint', textContent: 'Choose a skein to put out. Prices follow the season and the yarn itself.' }));
    const ul = el('ul', { className: 'items' });
    for (const v of available) {
      const p = priceOf(v, s);
      ul.append(
        el('li', {}, [
          swatch(yarnHex(v)),
          el('div', {}, [el('strong', { textContent: yarnName(v) }), el('small', { textContent: `${v.grams} g · ${v.yards} yd · ${v.grade} · $${p.price}` })]),
          btn('Put out', () => {
            placeOnShelf(s, slot, v.id);
            game.changed();
            playSfx('fleece_drop');
            onChange();
            close();
          }, 'btn primary small'),
        ]),
      );
    }
    body.append(ul);
  });
}

/** The counter: today's takings and recent sales. */
export function openLedger(): void {
  const s = game.state;
  openModal('Sales ledger', (body) => {
    body.append(
      el('dl', { className: 'info' }, [
        el('dt', { textContent: 'Today' }),
        el('dd', { textContent: `$${todaysEarnings(s)}` }),
        el('dt', { textContent: 'All time' }),
        el('dd', { textContent: `$${s.stats.earned} from ${s.stats.sold} skein${s.stats.sold === 1 ? '' : 's'}` }),
        el('dt', { textContent: 'Reputation' }),
        el('dd', { textContent: `★ ${s.reputation}` }),
      ]),
    );
    const sales = [...s.shop.sales].reverse().slice(0, 15);
    if (!sales.length) {
      body.append(el('p', { className: 'hint', textContent: 'No sales yet. Put some skeins on the shelves and customers will come by.' }));
      return;
    }
    const ul = el('ul', { className: 'ledger' });
    for (const sale of sales) {
      ul.append(
        el('li', {}, [
          el('span', { textContent: sale.name }),
          el('strong', { textContent: `$${sale.price}${sale.tip ? ` + $${sale.tip}` : ''}` }),
          el('small', { textContent: `${sale.by === 'daniel' ? 'Sold by Daniel' : 'Customer'} · ${new Date(sale.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` }),
        ]),
      );
    }
    body.append(ul);
  });
}

/** The note Daniel leaves on the counter when Madhu comes back. */
export function openAwaySummary(sum: AwaySummary): void {
  openModal('While you were away', (body) => {
    body.append(el('p', { className: 'hint', textContent: `You were away for ${formatDuration(sum.ms)}. Daniel minded the shop.` }));
    body.append(el('blockquote', { className: 'note', textContent: `${sum.note}\n— Daniel` }));
    if (sum.sales.length) {
      const total = sum.sales.reduce((a, s) => a + s.price, 0);
      const ul = el('ul', { className: 'ledger' });
      for (const s of sum.sales) ul.append(el('li', {}, [el('span', { textContent: s.name }), el('strong', { textContent: `$${s.price}` })]));
      body.append(ul, el('p', { className: 'stat', textContent: `Total: $${total}` }));
      playSfx('coin');
    }
  });
}

export function shelfTooltip(y: Yarn): string {
  return `${yarnName(y)} · $${priceOf(y, game.state).price}`;
}
