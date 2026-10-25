import { ValidationError } from './errors';
import type { ExerciseKind, WorkoutSet } from './types';
import { requireIntegerInRange, requireNull } from './validatePrimitives';

export interface SetValues {
  isWarmup: boolean;
  reps: number | null;
  weightLb: number | null;
  seconds: number | null;
}

function requireWeight(value: unknown): number {
  if (typeof value !== 'number' || value < 0 || value > 2000 || (value * 2) % 1 !== 0) {
    throw new ValidationError('weightLb', 'must be 0–2000 in steps of 0.5');
  }
  return value;
}

/** Checks a set's values against its exercise kind; returns the cleaned values. */
export function validateSetValues(kind: ExerciseKind, values: Partial<SetValues>): SetValues {
  if (typeof values.isWarmup !== 'boolean') throw new ValidationError('isWarmup', 'must be true or false');
  const { isWarmup } = values;
  if (kind === 'timed') {
    return {
      isWarmup,
      reps: requireNull('reps', values.reps, 'timed exercises'),
      weightLb: requireNull('weightLb', values.weightLb, 'timed exercises'),
      seconds: requireIntegerInRange('seconds', values.seconds, 1, 3600),
    };
  }
  const reps = requireIntegerInRange('reps', values.reps, 0, 100);
  const seconds = requireNull('seconds', values.seconds, `${kind} exercises`);
  if (kind === 'bodyweight') {
    return { isWarmup, reps, weightLb: requireNull('weightLb', values.weightLb, 'bodyweight exercises'), seconds };
  }
  return { isWarmup, reps, weightLb: requireWeight(values.weightLb), seconds };
}

export function valuesOf(set: WorkoutSet): SetValues {
  return { isWarmup: set.isWarmup, reps: set.reps, weightLb: set.weightLb, seconds: set.seconds };
}
