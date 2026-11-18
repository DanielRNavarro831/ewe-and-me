/** Shop levels by reputation (design doc). M6 wires up the rest of the unlocks. */
export interface ShopLevel {
  level: number;
  reputation: number;
  unlocks: string;
}

export const SHOP_LEVELS: ShopLevel[] = [
  { level: 1, reputation: 0, unlocks: 'Shop, 6 shelf slots, immersion dyeing, Nana Pearl and Theo' },
  { level: 2, reputation: 100, unlocks: 'Kettle dyeing, 10 shelf slots, Rosa, Shetland sheep for sale' },
  { level: 3, reputation: 300, unlocks: 'Speckle dyeing, wool combs, Ingrid, decorating catalog' },
  { level: 4, reputation: 700, unlocks: 'Hand-painted dyeing, Bluefaced Leicester sheep for sale, Wren, 14 shelf slots' },
  { level: 5, reputation: 1500, unlocks: 'Drum carder, larger dye pot, shop expansion' },
];

export function shopLevel(reputation: number): number {
  let lv = 1;
  for (const l of SHOP_LEVELS) if (reputation >= l.reputation) lv = l.level;
  return lv;
}
