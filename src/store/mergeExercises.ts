import { getDb } from './db';
import { ValidationError } from './errors';
import { requireRecord } from './lookups';
import type { DayType, Exercise } from './types';
import { writeTransaction } from './write';

function replaceId(ids: string[], fromId: string, intoId: string): string[] {
  return [...new Set(ids.map((id) => (id === fromId ? intoId : id)))];
}

function templateMentions(dayType: DayType, exerciseId: string): boolean {
  return dayType.exerciseIds.includes(exerciseId) || dayType.mainLiftIds.includes(exerciseId);
}

/** Moves all sets, workout exercises and template entries of fromId to intoId, then marks fromId merged. */
export async function mergeExercises(fromId: string, intoId: string): Promise<Exercise> {
  if (fromId === intoId) throw new ValidationError('intoId', 'must be a different exercise');
  return writeTransaction(['exercises', 'dayTypes', 'workoutExercises', 'sets'], async (context) => {
    const from = await requireRecord('exercises', fromId);
    const into = await requireRecord('exercises', intoId);
    if (into.mergedInto !== null) throw new ValidationError('intoId', 'is already merged into another exercise');
    const db = getDb();
    for (const set of await db.sets.where('[exerciseId+savedAt]').between([fromId, -Infinity], [fromId, Infinity]).toArray()) {
      await context.save('sets', { ...set, exerciseId: intoId });
    }
    for (const entry of await db.workoutExercises.where('exerciseId').equals(fromId).toArray()) {
      await context.save('workoutExercises', { ...entry, exerciseId: intoId });
    }
    for (const dayType of await db.dayTypes.filter((d) => !d.deleted && templateMentions(d, fromId)).toArray()) {
      await context.save('dayTypes', {
        ...dayType,
        exerciseIds: replaceId(dayType.exerciseIds, fromId, intoId),
        mainLiftIds: replaceId(dayType.mainLiftIds, fromId, intoId),
      });
    }
    return context.save('exercises', { ...from, mergedInto: intoId });
  });
}
