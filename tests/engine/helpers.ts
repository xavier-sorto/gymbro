import type { ExerciseSession } from '../../src/store/history';
import type { Exercise, WorkoutSet } from '../../src/store/types';

export type SetSpec = { w?: number; r?: number; s?: number; warm?: boolean };

export function session(startedAt: number, specs: SetSpec[]): ExerciseSession {
  const sets = specs.map(
    (spec, order): WorkoutSet => ({
      id: `set-${startedAt}-${order}`,
      updatedAt: startedAt,
      deleted: false,
      workoutId: `w${startedAt}`,
      workoutExerciseId: `we${startedAt}`,
      exerciseId: 'ex',
      order,
      isWarmup: spec.warm ?? false,
      reps: spec.r ?? null,
      weightLb: spec.w ?? null,
      seconds: spec.s ?? null,
      savedAt: startedAt + order,
    }),
  );
  return { workoutId: `w${startedAt}`, startedAt, isMainLift: false, sets };
}

export function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex',
    updatedAt: 0,
    deleted: false,
    name: 'Test',
    nameKey: 'test',
    kind: 'weighted',
    category: 'heavy',
    repMin: 6,
    repMax: 8,
    weightStepLb: 5,
    setStyle: 'straight',
    warmupSets: 0,
    restSeconds: 90,
    mergedInto: null,
    seed: false,
    ...overrides,
  };
}

/** Compact view of planned sets for assertions: "weight x reps" or seconds. */
export function show(sets: { weightLb: number | null; reps: number | null; seconds: number | null }[]): string[] {
  return sets.map((s) => (s.seconds !== null ? `${s.seconds}s` : s.weightLb !== null ? `${s.weightLb}x${s.reps}` : `${s.reps}`));
}
