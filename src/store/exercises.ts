import { getDb } from './db';
import { DuplicateNameError, ValidationError } from './errors';
import {
  validateExerciseFields,
  withExerciseDefaults,
  type ExerciseFields,
  type ExerciseInput,
} from './exerciseRules';
import { newId } from './ids';
import { requireRecord } from './lookups';
import { editDistance, toNameKey } from './text';
import type { Exercise } from './types';
import { writeTransaction } from './write';

const MAX_SIMILAR_RESULTS = 5;
const SIMILAR_MAX_DISTANCE = 2;
const SIMILAR_MIN_KEY_LENGTH = 5;

const isVisible = (exercise: Exercise) => !exercise.deleted && exercise.mergedInto === null;

export async function listExercises(): Promise<Exercise[]> {
  const visible = await getDb().exercises.filter(isVisible).toArray();
  return visible.sort((a, b) => a.name.localeCompare(b.name));
}

export function getExercise(id: string): Promise<Exercise> {
  return requireRecord('exercises', id);
}

/** Distance of a stored name key from the typed key, or null when it is not similar. */
function similarityDistance(typed: string, nameKey: string): number | null {
  if (nameKey === typed) return 0;
  if (typed.length < SIMILAR_MIN_KEY_LENGTH) return null;
  if (nameKey.includes(typed)) return 0;
  const distance = Math.min(
    editDistance(typed, nameKey),
    editDistance(typed, nameKey.slice(0, typed.length)),
  );
  return distance <= SIMILAR_MAX_DISTANCE ? distance : null;
}

export async function findSimilarExercises(name: string): Promise<Exercise[]> {
  const typed = toNameKey(name);
  const scored: { exercise: Exercise; distance: number }[] = [];
  for (const exercise of await listExercises()) {
    const distance = similarityDistance(typed, exercise.nameKey);
    if (distance !== null) scored.push({ exercise, distance });
  }
  scored.sort((a, b) => a.distance - b.distance || a.exercise.name.localeCompare(b.exercise.name));
  return scored.slice(0, MAX_SIMILAR_RESULTS).map(({ exercise }) => exercise);
}

async function assertNameFree(nameKey: string, ownId: string | null): Promise<void> {
  const clash = await getDb().exercises.where('nameKey').equals(nameKey).filter(isVisible).first();
  if (clash && clash.id !== ownId) throw new DuplicateNameError(clash.id);
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const fields = validateExerciseFields(withExerciseDefaults(input));
  return writeTransaction(['exercises'], async (context) => {
    await assertNameFree(fields.nameKey, null);
    return context.save('exercises', {
      id: newId(),
      ...fields,
      mergedInto: null,
      seed: false,
      updatedAt: 0,
      deleted: false,
    });
  });
}

export async function updateExercise(id: string, patch: Partial<ExerciseFields>): Promise<Exercise> {
  return writeTransaction(['exercises'], async (context) => {
    const existing = await requireRecord('exercises', id);
    const fields = validateExerciseFields({ ...existing, ...patch });
    if (fields.nameKey !== existing.nameKey) await assertNameFree(fields.nameKey, id);
    return context.save('exercises', { ...existing, ...fields });
  });
}

export async function deleteExercise(id: string): Promise<Exercise> {
  return writeTransaction(['exercises', 'sets'], async (context) => {
    const existing = await requireRecord('exercises', id);
    const setCount = await getDb()
      .sets.where('[exerciseId+savedAt]')
      .between([id, -Infinity], [id, Infinity])
      .filter((set) => !set.deleted)
      .count();
    if (setCount > 0) {
      throw new ValidationError('exercise', 'has logged sets; merge it into another exercise instead');
    }
    return context.save('exercises', { ...existing, deleted: true });
  });
}
