import { getDb } from './db';
import { newId } from './ids';
import { requireRecord } from './lookups';
import { liveSetsOf } from './liveSets';
import type { Workout, WorkoutExercise } from './types';
import { writeTransaction } from './write';

export function getActiveWorkout(): Promise<Workout | null> {
  return getDb()
    .workouts.filter((workout) => !workout.deleted && workout.finishedAt === null)
    .first()
    .then((workout) => workout ?? null);
}

/** Starts a workout from a day type's template, or returns the one already in progress. */
export function startWorkout(dayTypeId: string | null): Promise<Workout> {
  return writeTransaction(['workouts', 'workoutExercises', 'dayTypes', 'exercises'], async (context) => {
    const active = await getActiveWorkout();
    if (active) return active;
    const dayType = dayTypeId === null ? null : await requireRecord('dayTypes', dayTypeId);
    const workout = await context.save('workouts', {
      id: newId(),
      dayTypeId,
      startedAt: Date.now(),
      finishedAt: null,
      updatedAt: 0,
      deleted: false,
    });
    const templateIds = dayType?.exerciseIds ?? [];
    const exercises = await getDb().exercises.bulkGet(templateIds);
    let order = 0;
    for (const exercise of exercises) {
      if (!exercise || exercise.deleted) continue;
      const entry: WorkoutExercise = {
        id: newId(),
        workoutId: workout.id,
        exerciseId: exercise.id,
        order: ++order,
        isMainLift: dayType?.mainLiftIds.includes(exercise.id) ?? false,
        note: '',
        updatedAt: 0,
        deleted: false,
      };
      await context.save('workoutExercises', entry);
    }
    return workout;
  });
}

export function finishWorkout(id: string): Promise<Workout> {
  return writeTransaction(['workouts'], async (context) => {
    const workout = await requireRecord('workouts', id);
    return context.save('workouts', { ...workout, finishedAt: workout.finishedAt ?? Date.now() });
  });
}

/** Soft deletes the workout together with its workout exercises and sets. */
export function deleteWorkout(id: string): Promise<Workout> {
  return writeTransaction(['workouts', 'workoutExercises', 'sets'], async (context) => {
    const workout = await requireRecord('workouts', id);
    const db = getDb();
    const entries = await db.workoutExercises.where('workoutId').equals(id).toArray();
    for (const entry of entries.filter((e) => !e.deleted)) {
      await context.save('workoutExercises', { ...entry, deleted: true });
    }
    for (const set of await liveSetsOf(entries.map((e) => e.id))) await context.save('sets', { ...set, deleted: true });
    return context.save('workouts', { ...workout, deleted: true });
  });
}

export async function listWorkouts(options: { limit?: number; before?: number } = {}): Promise<Workout[]> {
  const { limit = 50, before } = options;
  return getDb()
    .workouts.orderBy('startedAt')
    .reverse()
    .filter(
      (workout) =>
        !workout.deleted && workout.finishedAt !== null && (before === undefined || workout.startedAt < before),
    )
    .limit(limit)
    .toArray();
}
