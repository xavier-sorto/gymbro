import type { ExerciseKind, WorkoutSet } from '../store';
import type { PlannedSet } from '../engine';

type SetLike = Pick<WorkoutSet | PlannedSet, 'weightLb' | 'reps' | 'seconds'>;

/** "65 × 8", "8" or "30 s", depending on the exercise kind. */
export function formatSet(kind: ExerciseKind, set: SetLike): string {
  if (kind === 'timed') return `${set.seconds ?? 0} s`;
  if (kind === 'bodyweight') return `${set.reps ?? 0}`;
  return `${set.weightLb ?? 0} × ${set.reps ?? 0}`;
}

/** "65 × 8, 8, 7": the weight is only repeated when it changes. */
export function formatSets(kind: ExerciseKind, sets: readonly SetLike[]): string {
  let previousWeight: number | null | undefined;
  return sets
    .map((set) => {
      const sameWeight = kind === 'weighted' && previousWeight === set.weightLb;
      previousWeight = set.weightLb;
      return sameWeight ? `${set.reps ?? 0}` : formatSet(kind, set);
    })
    .join(', ');
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** m:ss for a countdown. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** "42 min" or "1 h 5 min". */
export function formatDuration(milliseconds: number): string {
  const minutes = Math.max(0, Math.floor(milliseconds / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export const pluralSets = (count: number) => `${count} ${count === 1 ? 'set' : 'sets'}`;
