import { listDayTypes, listExercises } from '../../store';
import type { Exercise } from '../../store';
import { getDb } from '../../store/db';

/*
 * The store has no read that counts an exercise's sets, so this goes to the sets table directly,
 * counting the same live sets that deleteExercise refuses to orphan.
 */
export function countExerciseSets(exerciseId: string): Promise<number> {
  return getDb()
    .sets.where('[exerciseId+savedAt]')
    .between([exerciseId, -Infinity], [exerciseId, Infinity])
    .filter((set) => !set.deleted)
    .count();
}

export interface LibraryContents {
  exercises: Exercise[];
  /** Ids of exercises that are a main lift in at least one day type. */
  mainLiftIds: Set<string>;
}

export async function loadLibrary(): Promise<LibraryContents> {
  const [exercises, dayTypes] = await Promise.all([listExercises(), listDayTypes()]);
  return { exercises, mainLiftIds: new Set(dayTypes.flatMap((dayType) => dayType.mainLiftIds)) };
}
