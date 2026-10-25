import type { ExerciseSettings } from './settings';
import type { PlannedSet } from './types';

/** Stub until the warm-ups milestone: no warm-ups are suggested yet. */
export function warmupsFor(_exercise: Partial<ExerciseSettings>, _workingWeightLb: number | null): PlannedSet[] {
  return [];
}
