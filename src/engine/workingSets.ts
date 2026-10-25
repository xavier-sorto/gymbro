import type { ExerciseSession } from '../store/history';
import type { ExerciseKind, WorkoutSet } from '../store/types';
import type { PlannedSet } from './types';

type SetFields = Pick<WorkoutSet, 'isWarmup' | 'reps' | 'weightLb' | 'seconds'>;

const isNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** True for a non-warm-up set whose fields fit the exercise's kind. */
export function isWorkingSet(set: SetFields, kind: ExerciseKind): boolean {
  if (set.isWarmup) return false;
  if (kind === 'weighted') return isNumber(set.reps) && isNumber(set.weightLb);
  if (kind === 'bodyweight') return isNumber(set.reps) && !isNumber(set.weightLb);
  return isNumber(set.seconds);
}

export function toPlannedSet(set: SetFields): PlannedSet {
  return { weightLb: set.weightLb ?? null, reps: set.reps ?? null, seconds: set.seconds ?? null, isWarmup: false, role: 'working' };
}

export interface CountingSession {
  startedAt: number;
  workingSets: PlannedSet[];
}

/** Sessions (newest first) with at least one working set, keeping only those sets. */
export function countingSessions(history: readonly ExerciseSession[], kind: ExerciseKind): CountingSession[] {
  return history
    .map((session) => ({
      startedAt: session.startedAt,
      workingSets: session.sets.filter((set) => isWorkingSet(set, kind)).map(toPlannedSet),
    }))
    .filter((session) => session.workingSets.length > 0);
}
