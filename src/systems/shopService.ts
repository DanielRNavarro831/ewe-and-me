import type Phaser from 'phaser';
import { game } from '../game';
import { completeVisit, decide, makeCustomer, nextArrivalMs, awaySales, type Customer } from './customers';
import { tidyShelves, shelfYarns } from './economy';
import { playSfx } from './audio';
import { toast } from '../ui/modal';
import { openAwaySummary } from '../ui/shopUi';

/** Rooms where the shop keeps trading; minigames pause it so nothing interrupts the craft. */
const ROOMS = new Set(['Ranch', 'Workshop', 'DyeStudio', 'Shop', 'Stash', 'Collection']);

/** The Shop scene implements this to show customers walking in. */
export interface CustomerHost {
  receive(c: Customer): void;
}

let nextAt = 0;

export function startShopService(phaser: Phaser.Game): void {
  tidyShelves(game.state);
  nextAt = Date.now() + 20_000; // the first customer comes along fairly soon
  window.setInterval(() => tick(phaser), 1000);

  // Daniel minds the shop while Madhu is away.
  const onResume = (awayMs: number) => {
    if (awayMs < 60_000) return;
    const summary = awaySales(game.state, awayMs);
    game.changed();
    if (summary.sales.length || awayMs >= 20 * 60_000) openAwaySummary(summary);
  };
  game.onResume(onResume);
  onResume(game.away.ms);
}

function tick(phaser: Phaser.Game): void {
  if (document.visibilityState !== 'visible') return;
  const active = phaser.scene.getScenes(true).map((s) => s.sys.settings.key).filter((k) => k !== 'Boot');
  if (!active.length || !active.every((k) => ROOMS.has(k))) {
    // paused during minigames; don't let a backlog of customers pile up
    nextAt = Math.max(nextAt, Date.now() + 10_000);
    return;
  }
  if (Date.now() < nextAt) return;
  nextAt = Date.now() + nextArrivalMs(game.state.reputation);
  const c = makeCustomer(game.state);
  if (active.includes('Shop')) {
    (phaser.scene.getScene('Shop') as unknown as CustomerHost).receive(c);
    return;
  }
  // Madhu's elsewhere on the farm: the bell rings and the sale happens at the till.
  if (!shelfYarns(game.state).length) return;
  const v = decide(game.state, c);
  const sale = completeVisit(game.state, v);
  if (sale) {
    game.changed();
    playSfx('coin');
    toast(`Sold in the shop: ${sale.name}, $${sale.price}${sale.tip ? ` + $${sale.tip} tip` : ''}`);
  }
}
