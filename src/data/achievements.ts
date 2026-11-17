/** Achievements, with knitter in-jokes. More are wired up as their features arrive. */
export interface Achievement {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_fleece', name: 'First Fleece', description: 'Shear your first animal.' },
  { id: 'thwack', name: 'Thwack!', description: 'Finish your first skein.' },
  { id: 'yarn_chicken', name: 'Yarn Chicken', description: 'Complete a commission with under 5 yards of the yarn left over.' },
  { id: 'sable', name: 'SABLE', description: 'Own more yarn than you could knit in a lifetime.' },
  { id: 'frog_pond', name: 'Frog Pond', description: 'Frog (rip back) 10 skeins.' },
  { id: 'felted_again', name: 'Felted Again', description: 'Accidentally felt a fleece while scouring.' },
  { id: 'dye_lot_hero', name: 'Dye Lot Hero', description: 'Fill a commission needing 5 or more skeins from one lot.' },
  { id: 'full_rainbow', name: 'Full Rainbow', description: 'Discover 24 colorways.' },
  { id: 'shepherd', name: 'Shepherd', description: 'Own every v1 breed.' },
  { id: 'cat_tax', name: 'Cat Tax', description: 'Pet Iroh and Mango 100 times.' },
];
