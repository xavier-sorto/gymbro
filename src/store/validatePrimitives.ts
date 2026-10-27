import { ValidationError } from './errors';
import { MUSCLES, type Muscle } from './types';

export function requireTrimmedText(field: string, value: unknown, min: number, max: number): string {
  if (typeof value !== 'string') throw new ValidationError(field, 'must be text');
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ValidationError(field, min === 0 ? `must be at most ${max} characters` : `must be ${min}–${max} characters`);
  }
  return trimmed;
}

export function requireIntegerInRange(field: string, value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(field, `must be a whole number ${min}–${max}`);
  }
  return value;
}

export function requireOneOf<T extends string>(field: string, value: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) throw new ValidationError(field, `must be one of ${allowed.join(', ')}`);
  return value as T;
}

/** A muscle, or a list of distinct muscles at most `max` long. */
export function requireMuscleList(field: string, value: unknown, max: number, exclude: unknown = null): Muscle[] {
  if (!Array.isArray(value) || value.length > max || new Set(value).size !== value.length || value.some((item) => !MUSCLES.includes(item) || item === exclude)) {
    throw new ValidationError(field, `must be up to ${max} different muscles, not including the main one`);
  }
  return value as Muscle[];
}

export function requireNull(field: string, value: unknown, because: string): null {
  if (value !== null && value !== undefined) throw new ValidationError(field, `must be empty for ${because}`);
  return null;
}
