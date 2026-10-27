import { getDb } from './db';
import { NotFoundError } from './errors';
import { newId } from './ids';
import { requireRecord } from './lookups';
import { validateSetValues, valuesOf, type SetValues } from './setRules';
import type { WorkoutSet } from './types';
import { writeTransaction } from './write';

const SET_TABLES = ['sets', 'workoutExercises', 'workouts', 'exercises'] as const;

export type NewSetInput = { workoutExerciseId: string } & Partial<SetValues> & Pick<SetValues, 'isWarmup'>;

export function listSets(workoutExerciseId: string): Promise<WorkoutSet[]> {
  return getDb()
    .sets.where('workoutExerciseId')
    .equals(workoutExerciseId)
    .filter((set) => !set.deleted)
    .toArray()
    .then((sets) => sets.sort((a, b) => a.order - b.order));
}

export function saveSet(input: NewSetInput): Promise<WorkoutSet> {
  return writeTransaction([...SET_TABLES], async (context) => {
    const entry = await requireRecord('workoutExercises', input.workoutExerciseId);
    await requireRecord('workouts', entry.workoutId);
    const exercise = await requireRecord('exercises', entry.exerciseId);
    const values = validateSetValues(exercise.kind, {
      reps: null,
      weightLb: null,
      seconds: null,
      ...input,
    });
    const existing = await listSets(entry.id);
    const order = Math.max(0, ...existing.map((set) => set.order)) + 1;
    return context.save('sets', {
      id: newId(),
      workoutId: entry.workoutId,
      workoutExerciseId: entry.id,
      exerciseId: entry.exerciseId,
      order,
      ...values,
      savedAt: Date.now(),
      updatedAt: 0,
      deleted: false,
    });
  });
}

export function updateSet(id: string, patch: Partial<SetValues>): Promise<WorkoutSet> {
  return writeTransaction([...SET_TABLES], async (context) => {
    const existing = await requireRecord('sets', id);
    await requireRecord('workouts', existing.workoutId);
    const exercise = await requireRecord('exercises', existing.exerciseId);
    const values = validateSetValues(exercise.kind, { ...valuesOf(existing), ...patch });
    return context.save('sets', { ...existing, ...values });
  });
}

/** Brings back a set that was deleted, as long as its workout and exercise entry still exist. */
export function restoreSet(id: string): Promise<WorkoutSet> {
  return writeTransaction([...SET_TABLES], async (context) => {
    const existing = await getDb().sets.get(id);
    if (!existing) throw new NotFoundError('sets', id);
    await requireRecord('workouts', existing.workoutId);
    await requireRecord('workoutExercises', existing.workoutExerciseId);
    return context.save('sets', { ...existing, deleted: false });
  });
}

export function deleteSet(id: string): Promise<WorkoutSet> {
  return writeTransaction(['sets'], async (context) => {
    const existing = await requireRecord('sets', id);
    return context.save('sets', { ...existing, deleted: true });
  });
}
