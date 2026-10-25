import { getDb } from './db';
import type { WorkoutSet } from './types';

/**
 * Live sets of the given workout exercises, for the caller to soft delete inside its
 * own writeTransaction. Kept as a plain query (not an async wrapper that also writes)
 * so the transaction stays open between the read and the writes that follow.
 */
export function liveSetsOf(workoutExerciseIds: string[]): Promise<WorkoutSet[]> {
  return getDb()
    .sets.where('workoutExerciseId')
    .anyOf(workoutExerciseIds)
    .filter((set) => !set.deleted)
    .toArray();
}
