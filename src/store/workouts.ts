import { getDb } from './db';
import { newId } from './ids';
import { requireRecord } from './lookups';
import { ValidationError } from './errors';
import { liveSetsOf } from './liveSets';
import type { Workout, WorkoutExercise } from './types';
import { requireTrimmedText } from './validatePrimitives';
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

/**
 * Changes when a workout happened and the note on it. Moving the start keeps the duration, so a
 * finished workout's finish moves with it. The start cannot be in the future.
 */
export function updateWorkoutDetails(id: string, patch: { startedAt?: number; note?: string }): Promise<Workout> {
  return writeTransaction(['workouts'], async (context) => {
    const existing = await requireRecord('workouts', id);
    const updated: Workout = { ...existing };
    if (patch.startedAt !== undefined) {
      if (!Number.isFinite(patch.startedAt) || patch.startedAt > Date.now()) {
        throw new ValidationError('startedAt', 'must be a time that has already passed');
      }
      if (existing.finishedAt !== null) updated.finishedAt = existing.finishedAt + (patch.startedAt - existing.startedAt);
      updated.startedAt = patch.startedAt;
    }
    if (patch.note !== undefined) updated.note = requireTrimmedText('note', patch.note, 0, 500);
    return context.save('workouts', updated);
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
