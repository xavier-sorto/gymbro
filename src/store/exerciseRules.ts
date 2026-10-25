import { ValidationError } from './errors';
import { toNameKey } from './text';
import type { Exercise, ExerciseCategory, ExerciseKind, SetStyle } from './types';
import { requireIntegerInRange, requireOneOf, requireTrimmedText } from './validatePrimitives';

export const EXERCISE_KINDS = ['weighted', 'bodyweight', 'timed'] as const;
export const EXERCISE_CATEGORIES = ['heavy', 'compound', 'isolation'] as const;
export const SET_STYLES = ['straight', 'ramping'] as const;

export const DEFAULT_REP_RANGE: Record<ExerciseCategory, [number, number]> = {
  heavy: [6, 8],
  compound: [8, 10],
  isolation: [10, 15],
};

export interface ExerciseInput {
  name: string;
  kind: ExerciseKind;
  category: ExerciseCategory;
  repMin?: number;
  repMax?: number;
  weightStepLb?: number;
  setStyle?: SetStyle;
  warmupSets?: number;
  restSeconds?: number;
}

export type ExerciseFields = Pick<
  Exercise,
  'name' | 'kind' | 'category' | 'repMin' | 'repMax' | 'weightStepLb' | 'setStyle' | 'warmupSets' | 'restSeconds'
>;

export function withExerciseDefaults(input: ExerciseInput): ExerciseFields {
  const range = DEFAULT_REP_RANGE[input.category] ?? DEFAULT_REP_RANGE.compound;
  return {
    name: input.name,
    kind: input.kind,
    category: input.category,
    repMin: input.repMin ?? range[0],
    repMax: input.repMax ?? range[1],
    weightStepLb: input.weightStepLb ?? 5,
    setStyle: input.setStyle ?? 'straight',
    warmupSets: input.warmupSets ?? 2,
    restSeconds: input.restSeconds ?? 90,
  };
}

/** Validates every exercise field and returns the cleaned fields plus the nameKey. */
export function validateExerciseFields(fields: ExerciseFields): ExerciseFields & { nameKey: string } {
  const name = requireTrimmedText('name', fields.name, 1, 60);
  const nameKey = toNameKey(name);
  if (nameKey === '') throw new ValidationError('name', 'must contain letters or digits');
  const repMin = requireIntegerInRange('repMin', fields.repMin, 1, 100);
  const repMax = requireIntegerInRange('repMax', fields.repMax, 1, 100);
  if (repMax < repMin) throw new ValidationError('repMax', 'must not be below repMin');
  if (typeof fields.weightStepLb !== 'number' || !(fields.weightStepLb > 0) || fields.weightStepLb > 100) {
    throw new ValidationError('weightStepLb', 'must be a number above 0 and at most 100');
  }
  return {
    name,
    nameKey,
    kind: requireOneOf<ExerciseKind>('kind', fields.kind, EXERCISE_KINDS),
    category: requireOneOf<ExerciseCategory>('category', fields.category, EXERCISE_CATEGORIES),
    repMin,
    repMax,
    weightStepLb: fields.weightStepLb,
    setStyle: requireOneOf<SetStyle>('setStyle', fields.setStyle, SET_STYLES),
    warmupSets: requireIntegerInRange('warmupSets', fields.warmupSets, 0, 3),
    restSeconds: requireIntegerInRange('restSeconds', fields.restSeconds, 15, 600),
  };
}
