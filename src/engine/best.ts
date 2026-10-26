import type { ExerciseKind } from '../store/types';
import type { Best, PlannedSet } from './types';
import type { CountingSession } from './workingSets';

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
