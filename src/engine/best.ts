import type { ExerciseKind } from '../store/types';
import type { Best, PlannedSet } from './types';
import { toPlannedSet, type CountingSession } from './workingSets';

type Score = [number, number];

/** Ranks a set; larger is better. Weighted: weight then reps. Others: the one measure. */
function score(kind: ExerciseKind, set: PlannedSet): Score {
  if (kind === 'weighted') return [set.weightLb ?? 0, set.reps ?? 0];
  if (kind === 'bodyweight') return [set.reps ?? 0, 0];
  return [set.seconds ?? 0, 0];
}

const isBetter = (a: Score, b: Score) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

function toBest(kind: ExerciseKind, set: PlannedSet, startedAt: number): Best {
  if (kind === 'weighted') return { weightLb: set.weightLb ?? 0, reps: set.reps ?? 0, startedAt };
  if (kind === 'bodyweight') return { reps: set.reps ?? 0, startedAt };
  return { seconds: set.seconds ?? 0, startedAt };
}

/** Best set across all sessions (newest first, so a tie keeps the newer session). */
export function bestSoFar(sessions: readonly CountingSession[], kind: ExerciseKind): Best | null {
  let best: Best | null = null;
  let bestScore: Score = [-Infinity, -Infinity];
  for (const session of sessions) {
    for (const set of session.workingSets) {
      const setScore = score(kind, set);
      if (!isBetter(setScore, bestScore)) continue;
      bestScore = setScore;
      best = toBest(kind, set, session.startedAt);
    }
  }
  return best;
}

/**
 * True when `set` beats the best from past sessions and every earlier working set of this workout.
 * With no past best (the very first time) nothing counts as a record.
 */
export function beatsBest(
  kind: ExerciseKind,
  set: PlannedSet,
  best: Best | null,
  earlierToday: readonly PlannedSet[],
): boolean {
  if (!best) return false;
  let bar = score(kind, toPlannedSet({ isWarmup: false, weightLb: best.weightLb ?? null, reps: best.reps ?? null, seconds: best.seconds ?? null }));
  for (const earlier of earlierToday) {
    const earlierScore = score(kind, earlier);
    if (isBetter(earlierScore, bar)) bar = earlierScore;
  }
  return isBetter(score(kind, set), bar);
}

export interface BestChange {
  value: number;
  unit: 'lb' | 'rep' | 's';
}

/** How a best set differs from an earlier one: weight first for weighted lifts, then reps; 0 means the same. */
export function compareBest(kind: ExerciseKind, now: Best, before: Best): BestChange {
  if (kind === 'weighted') {
    const lb = (now.weightLb ?? 0) - (before.weightLb ?? 0);
    return lb !== 0 ? { value: lb, unit: 'lb' } : { value: (now.reps ?? 0) - (before.reps ?? 0), unit: 'rep' };
  }
  if (kind === 'bodyweight') return { value: (now.reps ?? 0) - (before.reps ?? 0), unit: 'rep' };
  return { value: (now.seconds ?? 0) - (before.seconds ?? 0), unit: 's' };
}

/** Epley estimate of the heaviest single, in whole pounds. */
export const estimatedOneRepMax = (weightLb: number, reps: number) =>
  reps <= 1 ? weightLb : Math.round(weightLb * (1 + reps / 30));
