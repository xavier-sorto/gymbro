import { bestSoFar, compareBest } from './best';
import type { EffectiveSettings } from './settings';
import type { Guide } from './types';
import type { CountingSession } from './workingSets';
import type { ExerciseKind } from '../store/types';

/** Sessions in a row without beating the one before, from the newest, that count as a stall. */
export const STALL_SESSIONS = 3;
/** The suggested reset is this share of the stuck weight. */
const RESET_SHARE = 0.9;

/**
 * Weighted lifts only. A session with no progress over the one before it extends the run; the run
 * ends at the first session that did progress. A lighter newest session is a deload, not a stall,
 * so the warning clears once the suggestion is taken. `sessions` is newest first.
 */
export function stallFor(kind: ExerciseKind, sessions: readonly CountingSession[], settings: EffectiveSettings): Guide['stall'] {
  if (kind !== 'weighted') return null;
  const bests = sessions.flatMap((session) => bestSoFar([session], kind) ?? []);
  let stuckSessions = 0;
  while (stuckSessions + 1 < bests.length) {
    const change = compareBest(kind, bests[stuckSessions]!, bests[stuckSessions + 1]!);
    if (change.value > 0 || (change.unit === 'lb' && change.value < 0)) break;
    stuckSessions += 1;
  }
  if (stuckSessions < STALL_SESSIONS) return null;
  const stuckWeight = bests[0]!.weightLb ?? 0;
  const weightLb = Math.max(settings.weightStepLb, Math.floor((stuckWeight * RESET_SHARE) / settings.weightStepLb) * settings.weightStepLb);
  return { stuckSessions, reset: { weightLb, reps: settings.repMax, seconds: null, isWarmup: false, role: 'working' } };
}
