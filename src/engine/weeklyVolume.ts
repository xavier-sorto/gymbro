import { musclesOf } from './muscles';
import type { Exercise, Muscle } from '../store/types';
import { MUSCLES } from '../store/types';

/** A set that helps a muscle indirectly counts for half, the usual convention for fractional sets. */
export const SECONDARY_WEIGHT = 0.5;
/** A workout counts as a training day for a muscle when it gave that muscle at least this many sets. */
export const DAY_MIN_SETS = 2;

export interface VolumeSet {
  workoutId: string;
  /** The exercise the set belongs to, merges already followed; null when it can no longer be found. */
  exercise: Pick<Exercise, 'id' | 'primaryMuscle' | 'secondaryMuscles'> | null;
}

export interface MuscleWeek {
  /** Working sets, secondary work counted as half. */
  sets: number;
  /** Workouts that gave the muscle at least DAY_MIN_SETS sets. */
  days: number;
}

export interface WeeklyVolume {
  byMuscle: Record<Muscle, MuscleWeek>;
  /** Sets whose exercise has no muscle set, so they are in no row above. */
  unassignedSets: number;
}

/** Adds up one week of working sets (warm-ups already left out) by muscle. */
export function weeklyVolume(sets: readonly VolumeSet[]): WeeklyVolume {
  const totals = Object.fromEntries(MUSCLES.map((muscle) => [muscle, new Map<string, number>()])) as Record<Muscle, Map<string, number>>;
  let unassignedSets = 0;
  for (const { workoutId, exercise } of sets) {
    const { primary, secondary } = exercise ? musclesOf(exercise) : { primary: null, secondary: [] };
    if (!primary) {
      unassignedSets += 1;
      continue;
    }
    const credits: [Muscle, number][] = [[primary, 1], ...secondary.filter((muscle) => muscle !== primary).map((muscle): [Muscle, number] => [muscle, SECONDARY_WEIGHT])];
    for (const [muscle, credit] of credits) totals[muscle].set(workoutId, (totals[muscle].get(workoutId) ?? 0) + credit);
  }
  const byMuscle = Object.fromEntries(
    MUSCLES.map((muscle) => {
      const perWorkout = [...totals[muscle].values()];
      return [muscle, { sets: perWorkout.reduce((sum, value) => sum + value, 0), days: perWorkout.filter((value) => value >= DAY_MIN_SETS).length }];
    }),
  ) as Record<Muscle, MuscleWeek>;
  return { byMuscle, unassignedSets };
}
