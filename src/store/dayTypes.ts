import { getDb } from './db';
import { ValidationError } from './errors';
import { newId } from './ids';
import { requireRecord } from './lookups';
import type { DayType } from './types';
import { requireIntegerInRange, requireTrimmedText } from './validatePrimitives';
import { writeTransaction } from './write';

export interface DayTypePatch {
  name?: string;
  order?: number;
  exerciseIds?: string[];
  mainLiftIds?: string[];
}

/** Callers must pass at least one id: awaiting a call that touches no table would let the transaction close. */
async function requireKnownExercises(exerciseIds: string[]): Promise<void> {
  const found = await getDb().exercises.bulkGet(exerciseIds);
  const unknownIndex = found.findIndex((exercise) => !exercise || exercise.deleted);
  if (unknownIndex >= 0) {
    throw new ValidationError('exerciseIds', `unknown exercise ${exerciseIds[unknownIndex]}`);
  }
}

function validatedDayType(candidate: DayType): DayType {
  const name = requireTrimmedText('name', candidate.name, 1, 40);
  const order = requireIntegerInRange('order', candidate.order, 0, 10000);
  const stray = candidate.mainLiftIds.find((id) => !candidate.exerciseIds.includes(id));
  if (stray !== undefined) throw new ValidationError('mainLiftIds', `${stray} is not in exerciseIds`);
  return { ...candidate, name, order };
}

export async function listDayTypes(): Promise<DayType[]> {
  const all = await getDb().dayTypes.filter((dayType) => !dayType.deleted).toArray();
  return all.sort((a, b) => a.order - b.order);
}

export function getDayType(id: string): Promise<DayType> {
  return requireRecord('dayTypes', id);
}

export async function createDayType(input: { name: string }): Promise<DayType> {
  return writeTransaction(['dayTypes'], async (context) => {
    const existing = await listDayTypes();
    const order = Math.max(0, ...existing.map((dayType) => dayType.order)) + 1;
    const dayType = validatedDayType({
      id: newId(),
      name: input.name,
      order,
      exerciseIds: [],
      mainLiftIds: [],
      seed: false,
      updatedAt: 0,
      deleted: false,
    });
    return context.save('dayTypes', dayType);
  });
}

export async function updateDayType(id: string, patch: DayTypePatch): Promise<DayType> {
  return writeTransaction(['dayTypes', 'exercises'], async (context) => {
    const existing = await requireRecord('dayTypes', id);
    const updated = validatedDayType({ ...existing, ...patch });
    if (patch.exerciseIds?.length) await requireKnownExercises(patch.exerciseIds);
    return context.save('dayTypes', updated);
  });
}

export async function deleteDayType(id: string): Promise<DayType> {
  return writeTransaction(['dayTypes'], async (context) => {
    const existing = await requireRecord('dayTypes', id);
    return context.save('dayTypes', { ...existing, deleted: true });
  });
}
