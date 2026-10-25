import type { EffectiveSettings } from './settings';
import type { PlannedSet, Target } from './types';

/** Ramping sets: only the top set decides progression; the climb moves with it. */
export function rampingTarget(lastSets: readonly PlannedSet[], settings: EffectiveSettings): Target {
  const topWeight = Math.max(...lastSets.map((set) => set.weightLb ?? 0));
  const topIndex = lastSets.map((set) => set.weightLb).lastIndexOf(topWeight);
  const topReps = lastSets[topIndex]?.reps ?? 0;
  const climb = lastSets.slice(0, topIndex).filter((set) => (set.weightLb ?? 0) < topWeight);
  const increase = topReps >= settings.repMax;
  const newTopWeight = increase ? topWeight + settings.weightStepLb : topWeight;
  const shift = newTopWeight - topWeight;
  return {
    sets: [
      ...climb.map((set): PlannedSet => ({ ...set, weightLb: (set.weightLb ?? 0) + shift, role: 'climb' })),
      { weightLb: newTopWeight, reps: increase ? settings.repMin : topReps + 1, seconds: null, isWarmup: false, role: 'top' },
    ],
    note: increase ? `Top set +${settings.weightStepLb} lb` : 'One more rep on top set',
  };
}
