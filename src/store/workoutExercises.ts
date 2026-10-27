import { getDb } from './db';
import { ValidationError } from './errors';
import { newId } from './ids';
import { requireRecord } from './lookups';
import { liveSetsOf } from './liveSets';
import type { WorkoutExercise } from './types';
import { requireIntegerInRange, requireTrimmedText } from './validatePrimitives';
import { writeTransaction } from './write';

export interface WorkoutExercisePatch {
  order?: number;
  isMainLift?: boolean;
  note?: string;
}

export function addWorkoutExercise(workoutId: string, exerciseId: string): Promise<WorkoutExercise> {
  return writeTransaction(['workoutExercises', 'workouts', 'exercises'], async (context) => {
    await requireRecord('workouts', workoutId);
    await requireRecord('exercises', exerciseId);
    const siblings = await getDb().workoutExercises.where('workoutId').equals(workoutId).filter((e) => !e.deleted).toArray();
    const order = Math.max(0, ...siblings.map((entry) => entry.order)) + 1;
    return context.save('workoutExercises', {
      id: newId(),
      workoutId,
      exerciseId,
      order,
      isMainLift: false,
      note: '',
      updatedAt: 0,
      deleted: false,
    });
  });
}

export function updateWorkoutExercise(id: string, patch: WorkoutExercisePatch): Promise<WorkoutExercise> {
  return writeTransaction(['workoutExercises'], async (context) => {
    const existing = await requireRecord('workoutExercises', id);
    const merged = { ...existing, ...patch };
    if (typeof merged.isMainLift !== 'boolean') throw new ValidationError('isMainLift', 'must be true or false');
    return context.save('workoutExercises', {
      ...merged,
      order: requireIntegerInRange('order', merged.order, 1, 1000),
      note: requireTrimmedText('note', merged.note, 0, 500),
    });
  });
}

/** Replaces the exercise in a workout entry. Only while it has no sets, so no set ends up under the wrong exercise. */
export function swapWorkoutExercise(id: string, exerciseId: string): Promise<WorkoutExercise> {
  return writeTransaction(['workoutExercises', 'sets', 'exercises'], async (context) => {
    const existing = await requireRecord('workoutExercises', id);
    await requireRecord('exercises', exerciseId);
    if ((await liveSetsOf([id])).length > 0) throw new ValidationError('exerciseId', 'cannot be changed once sets are logged');
    return context.save('workoutExercises', { ...existing, exerciseId });
  });
}

export function removeWorkoutExercise(id: string): Promise<WorkoutExercise> {
  return writeTransaction(['workoutExercises', 'sets'], async (context) => {
    const existing = await requireRecord('workoutExercises', id);
    for (const set of await liveSetsOf([id])) await context.save('sets', { ...set, deleted: true });
    return context.save('workoutExercises', { ...existing, deleted: true });
  });
}
