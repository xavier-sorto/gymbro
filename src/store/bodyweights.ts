import { getDb } from './db';
import { ValidationError } from './errors';
import { newId } from './ids';
import { requireRecord } from './lookups';
import type { Bodyweight } from './types';
import { writeTransaction } from './write';

export const MIN_BODYWEIGHT_LB = 20;
export const MAX_BODYWEIGHT_LB = 1500;

/** Checks a body weight in pounds and rounds it to a tenth. */
export function validatedBodyweight(field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < MIN_BODYWEIGHT_LB || value > MAX_BODYWEIGHT_LB) {
    throw new ValidationError(field, `must be between ${MIN_BODYWEIGHT_LB} and ${MAX_BODYWEIGHT_LB} lb`);
  }
  return Math.round(value * 10) / 10;
}

/** Weigh-ins, newest first. */
export function listBodyweights(): Promise<Bodyweight[]> {
  return getDb()
    .bodyweights.orderBy('measuredAt')
    .reverse()
    .filter((entry) => !entry.deleted)
    .toArray();
}

export async function addBodyweight(input: { weightLb: number; measuredAt?: number }): Promise<Bodyweight> {
  const measuredAt = input.measuredAt ?? Date.now();
  if (!Number.isFinite(measuredAt)) throw new ValidationError('measuredAt', 'must be a time');
  const weightLb = validatedBodyweight('weightLb', input.weightLb);
  return writeTransaction(['bodyweights'], (context) =>
    context.save('bodyweights', { id: newId(), updatedAt: 0, deleted: false, measuredAt, weightLb }),
  );
}

export function deleteBodyweight(id: string): Promise<Bodyweight> {
  return writeTransaction(['bodyweights'], async (context) => {
    const existing = await requireRecord('bodyweights', id);
    return context.save('bodyweights', { ...existing, deleted: true });
  });
}
