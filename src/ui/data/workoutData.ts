import { getDb } from '../../store/db';
import type { WorkoutExercise } from '../../store';

/*
 * The store exports no read for a workout's exercise entries or for recently used exercises,
 * so these small reads go to the tables directly.
 */

export async function listWorkoutEntries(workoutId: string): Promise<WorkoutExercise[]> {
  const rows = await getDb().workoutExercises.where('workoutId').equals(workoutId).filter((e) => !e.deleted).toArray();
  return rows.sort((a, b) => a.order - b.order);
}

export async function getWorkoutEntry(id: string): Promise<WorkoutExercise | null> {
  const entry = await getDb().workoutExercises.get(id);
  return entry && !entry.deleted ? entry : null;
}

/** Exercise ids from the most recently written sets, newest first, without repeats. */
export async function listRecentExerciseIds(limit: number): Promise<string[]> {
  const sets = await getDb().sets.orderBy('updatedAt').reverse().filter((set) => !set.deleted).limit(200).toArray();
  const ids: string[] = [];
  for (const set of sets) if (!ids.includes(set.exerciseId) && ids.length < limit) ids.push(set.exerciseId);
  return ids;
}
