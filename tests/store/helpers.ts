import { vi } from 'vitest';
import { GymBroDatabase } from '../../src/store/db';
import { getDb } from '../../src/store/db';
import { addWorkoutExercise, createExercise, getActiveWorkout, startWorkout, finishWorkout, saveSet, listSets } from '../../src/store';
import type { Workout, WorkoutExercise } from '../../src/store';

export const SEED_PUSH = 'seed-day-push';
export const SEED_BENCH = 'seed-ex-db-bench';

export const outboxCount = () => getDb().outbox.count();

export async function workoutExercisesOf(workoutId: string): Promise<WorkoutExercise[]> {
  const rows = await getDb().workoutExercises.where('workoutId').equals(workoutId).toArray();
  return rows.sort((a, b) => a.order - b.order);
}

/** Starts, logs one set of each given exercise, and finishes a workout. */
export async function finishedWorkoutWith(exerciseIds: string[], dayTypeId: string | null = null): Promise<Workout> {
  const active = await getActiveWorkout();
  if (active) await finishWorkout(active.id);
  const workout = await startWorkout(dayTypeId);
  for (const exerciseId of exerciseIds) {
    const existing = (await workoutExercisesOf(workout.id)).find((e) => e.exerciseId === exerciseId);
    const entry = existing ?? (await addWorkoutExercise(workout.id, exerciseId));
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, reps: 8, weightLb: 100 });
  }
  return finishWorkout(workout.id);
}

export async function newWeightedExercise(name: string) {
  return createExercise({ name, kind: 'weighted', category: 'compound' });
}

export { listSets };

/** Makes every put on the named table throw (until the returned spy is restored). */
export function failPuts(tableName: string, error: Error, times = Infinity) {
  let proto = Object.getPrototypeOf(new GymBroDatabase().exercises);
  while (!Object.prototype.hasOwnProperty.call(proto, 'put')) proto = Object.getPrototypeOf(proto);
  const realPut = proto.put;
  let remaining = times;
  return vi.spyOn(proto, 'put').mockImplementation(function (this: { name: string }, ...args: unknown[]) {
    if (this.name === tableName && remaining-- > 0) return Promise.reject(error);
    return realPut.apply(this, args);
  });
}
