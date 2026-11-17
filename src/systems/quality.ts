import type { Animal, Fleece, GameState, Grade } from './state';
import { newId } from './state';
import { breed, naturalColor } from '../data/breeds';
import { feed } from '../data/feeds';
import { rawGrams, stapleCm } from './ranch';
import { clock } from './clock';

/**
 * Fleece quality (design doc):
 *   score = 40 + 0.2·happiness + feed(0–10) + growth(0–10) + skirting(0–20) − VM(0–10)
 * Second cuts from shearing take off a little more (up to 5).
 * Skirting is added in the Workshop (M2), so a fresh fleece tops out around 75.
 */

export function gradeOf(score: number): Grade {
  return score >= 90 ? 'Masterwork' : score >= 70 ? 'Superior' : score >= 50 ? 'Fine' : 'Common';
}

export function shearFleece(state: GameState, a: Animal, secondCuts: number): Fleece {
  const b = breed(a.breedId);
  const g = Math.max(a.growth, 0.0001);
  const feedPts = feed('hay').qualityPoints * (a.fedGrowth / g) + feed('grain').qualityPoints * (a.grainGrowth / g);
  const growthPts = 10 * Math.max(0, Math.min(1, (a.growth - 0.5) / 0.5));
  const happinessPts = 0.2 * a.happiness;
  const vm = b.baseVm; // clean feeders and pasture upgrades lower this later
  const cuts = Math.min(5, secondCuts * 0.5);
  const score = Math.round(Math.max(0, Math.min(100, 40 + happinessPts + feedPts + growthPts - vm - cuts)));

  const fleece: Fleece = {
    id: newId(state, 'f'),
    breedId: b.id,
    colorId: naturalColor(b, a.colorId).id,
    from: a.name ?? 'your sheep',
    rawGrams: Math.round(rawGrams(a)),
    stapleCm: Math.round(stapleCm(a) * 10) / 10,
    score,
    grade: gradeOf(score),
    parts: {
      happiness: Math.round(happinessPts * 10) / 10,
      feed: Math.round(feedPts * 10) / 10,
      growth: Math.round(growthPts * 10) / 10,
      vm,
      secondCuts: Math.round(cuts * 10) / 10,
    },
    secondCuts,
    shornAt: clock.now(),
  };

  a.growth = 0;
  a.fedGrowth = 0;
  a.grainGrowth = 0;
  a.timesShorn += 1;
  a.updatedAt = clock.now();
  state.fleeces.push(fleece);
  state.stats.shorn += 1;
  return fleece;
}
