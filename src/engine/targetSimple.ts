import type { EffectiveSettings } from './settings';
import type { PlannedSet, Target } from './types';

const working = (weightLb: number | null, reps: number | null, seconds: number | null): PlannedSet => ({
  weightLb,
  reps,
  seconds,
  isWarmup: false,
  role: 'working',
});

/** Index of the first smallest value (first on ties). */
const indexOfSmallest = (values: readonly number[]) => values.indexOf(Math.min(...values));

/** Weighted straight sets: only the sets at the session's top weight count. */
export function straightTarget(lastSets: readonly PlannedSet[], settings: EffectiveSettings): Target {
  const topWeight = Math.max(...lastSets.map((set) => set.weightLb ?? 0));
  const atTop = lastSets.filter((set) => set.weightLb === topWeight);
  if (atTop.every((set) => (set.reps ?? 0) >= settings.repMax)) {
    return {
      sets: atTop.map(() => working(topWeight + settings.weightStepLb, settings.repMin, null)),
      note: `Add ${settings.weightStepLb} lb`,
    };
  }
  const firstShort = atTop.findIndex((set) => (set.reps ?? 0) < settings.repMax);
  return {
    sets: atTop.map((set, index) => working(topWeight, (set.reps ?? 0) + (index === firstShort ? 1 : 0), null)),
    note: 'One more rep',
  };
}

export function bodyweightTarget(lastSets: readonly PlannedSet[], settings: EffectiveSettings): Target {
  const reps = lastSets.map((set) => set.reps ?? 0);
  const fewest = indexOfSmallest(reps);
  const ready = reps.every((count) => count >= settings.repMax);
  return {
    sets: reps.map((count, index) => working(null, count + (index === fewest ? 1 : 0), null)),
    note: ready ? 'One more rep. Ready for a harder version' : 'One more rep',
  };
}

export function timedTarget(lastSets: readonly PlannedSet[]): Target {
  const seconds = lastSets.map((set) => set.seconds ?? 0);
  const shortest = indexOfSmallest(seconds);
  return {
    sets: seconds.map((value, index) => working(null, null, value + (index === shortest ? 5 : 0))),
    note: '+5 seconds',
  };
}
