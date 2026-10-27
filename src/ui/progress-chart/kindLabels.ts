import type { Best } from '../../engine/types';
import type { ExerciseKind } from '../../store/types';
import { formatSet } from '../format';

export const LEGEND: Record<ExerciseKind, { line: string; bars: string | null }> = {
  weighted: { line: 'Heaviest weight (lb)', bars: 'Volume' },
  bodyweight: { line: 'Most reps in a set', bars: 'Total reps' },
  timed: { line: 'Longest hold (s)', bars: null },
};

/** "65 × 8", "12 reps" or "45 s". */
export function formatBest(kind: ExerciseKind, best: Best): string {
  if (kind === 'bodyweight') return `${best.reps ?? 0} reps`;
  return formatSet(kind, { weightLb: best.weightLb ?? null, reps: best.reps ?? null, seconds: best.seconds ?? null });
}
