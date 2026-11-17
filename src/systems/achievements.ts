import { game } from '../game';
import { ACHIEVEMENTS } from '../data/achievements';
import { playSfx } from './audio';
import { toast } from '../ui/modal';

/** Awards an achievement once, with a chime and a toast. Returns true if it was new. */
export function unlock(id: string): boolean {
  const s = game.state;
  if (s.achievements.includes(id)) return false;
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return false;
  s.achievements.push(id);
  game.changed();
  playSfx('achievement_chime');
  toast(`Achievement: ${a.name}`, 3200);
  return true;
}
