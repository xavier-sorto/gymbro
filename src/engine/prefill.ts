import type { WorkoutSet } from '../store/types';
import type { Guide, PlannedSet } from './types';

type EnteredSet = Pick<WorkoutSet, 'isWarmup' | 'reps' | 'weightLb' | 'seconds'>;

/**
 * The planned set for the next set to log: remaining warm-ups, then target sets, then a copy of the
 * last working set entered today; null when nothing is known. `setsDoneToday` is in entry order.
 */
export function prefillNext(guide: Guide, setsDoneToday: readonly EnteredSet[]): PlannedSet | null {
  const warmupsDone = setsDoneToday.filter((set) => set.isWarmup).length;
  const workingDone = setsDoneToday.filter((set) => !set.isWarmup);
  const nextPlanned = guide.warmups[warmupsDone] ?? guide.target?.sets[workingDone.length];
  if (nextPlanned) return nextPlanned;
  const lastEntered = workingDone[workingDone.length - 1];
  if (!lastEntered) return null;
  return { weightLb: lastEntered.weightLb, reps: lastEntered.reps, seconds: lastEntered.seconds, isWarmup: false, role: 'working' };
}
