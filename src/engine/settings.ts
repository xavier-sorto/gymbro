import { DEFAULT_REP_RANGE } from '../store/exerciseRules';
import type { Exercise } from '../store/types';

export const DEFAULT_WEIGHT_STEP_LB = 5;
export const DEFAULT_REST_SECONDS = 90;
export const MAX_WARMUP_SETS = 3;

export type ExerciseSettings = Pick<
  Exercise,
  'kind' | 'category' | 'repMin' | 'repMax' | 'weightStepLb' | 'setStyle' | 'warmupSets' | 'restSeconds'
>;

export interface EffectiveSettings {
  repMin: number;
  repMax: number;
  weightStepLb: number;
  warmupSets: number;
  restSeconds: number;
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** Replaces missing or invalid settings with defaults; never throws. */
export function effectiveSettings(exercise: Partial<ExerciseSettings>): EffectiveSettings {
  const { repMin, repMax } = exercise;
  const repsValid = isPositive(repMin) && isPositive(repMax) && repMin <= repMax;
  const [defaultMin, defaultMax] =
    DEFAULT_REP_RANGE[exercise.category as keyof typeof DEFAULT_REP_RANGE] ?? DEFAULT_REP_RANGE.compound;
  const warmups =
    typeof exercise.warmupSets === 'number' && Number.isFinite(exercise.warmupSets) ? exercise.warmupSets : 0;
  return {
    repMin: repsValid ? repMin : defaultMin,
    repMax: repsValid ? repMax : defaultMax,
    weightStepLb: isPositive(exercise.weightStepLb) ? exercise.weightStepLb : DEFAULT_WEIGHT_STEP_LB,
    warmupSets: Math.min(MAX_WARMUP_SETS, Math.max(0, Math.round(warmups))),
    restSeconds: isPositive(exercise.restSeconds) ? exercise.restSeconds : DEFAULT_REST_SECONDS,
  };
}
