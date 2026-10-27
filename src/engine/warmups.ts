import { effectiveSettings, type ExerciseSettings } from './settings';
import type { PlannedSet } from './types';

/** Warm-up ladders by how many the exercise asks for: [share of the working weight, reps]. */
const LADDERS: Record<number, [number, number][]> = {
  1: [[0.5, 5]],
  2: [[0.5, 5], [0.75, 3]],
  3: [[0.4, 5], [0.6, 3], [0.8, 2]],
};

/** Lighter sets leading up to `workingWeightLb`, rounded to the weight step; none for non-weighted exercises. */
export function warmupsFor(exercise: Partial<ExerciseSettings>, workingWeightLb: number | null): PlannedSet[] {
  if (exercise.kind !== 'weighted' || workingWeightLb === null || workingWeightLb <= 0) return [];
  const { warmupSets, weightStepLb } = effectiveSettings(exercise);
  const seen = new Set<number>();
  return (LADDERS[warmupSets] ?? []).flatMap(([share, reps]) => {
    const weightLb = Math.round((workingWeightLb * share) / weightStepLb) * weightStepLb;
    // Tiny weights round to 0 or onto the working weight, and a coarse step can repeat a weight.
    if (weightLb <= 0 || weightLb >= workingWeightLb || seen.has(weightLb)) return [];
    seen.add(weightLb);
    return [{ weightLb, reps, seconds: null, isWarmup: true, role: 'warmup' as const }];
  });
}
