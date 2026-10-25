import type { WorkoutSet } from '../store/types';
import { effectiveSettings, type ExerciseSettings } from './settings';

export const WARMUP_REST_SECONDS = 60;

/** Seconds of rest after a saved set: 60 after a warm-up, otherwise the exercise's own (default 90). */
export function restAfter(exercise: Partial<ExerciseSettings>, savedSet: Pick<WorkoutSet, 'isWarmup'>): number {
  return savedSet.isWarmup ? WARMUP_REST_SECONDS : effectiveSettings(exercise).restSeconds;
}
