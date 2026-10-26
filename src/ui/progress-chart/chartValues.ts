import { bestSoFar } from '../../engine/best';
import type { Best } from '../../engine/types';
import { countingSessions, type CountingSession } from '../../engine/workingSets';
import type { ExerciseSession } from '../../store/history';
import type { ExerciseKind } from '../../store/types';

export type RangeKey = '3m' | '1y' | 'all';

/** One session's chart numbers. `bar` is null when the kind has no bars (timed). */
export interface ChartPoint {
  startedAt: number;
  line: number;
  bar: number | null;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** The chart numbers of one session, using only its working sets. */
export function pointForSession(session: CountingSession, kind: ExerciseKind): ChartPoint {
  const sets = session.workingSets;
  const reps = sets.map((set) => set.reps ?? 0);
  const startedAt = session.startedAt;
  if (kind === 'weighted') {
    return {
      startedAt,
      line: Math.max(...sets.map((set) => set.weightLb ?? 0)),
      bar: sum(sets.map((set) => (set.reps ?? 0) * (set.weightLb ?? 0))),
    };
  }
  if (kind === 'bodyweight') return { startedAt, line: Math.max(...reps), bar: sum(reps) };
  return { startedAt, line: Math.max(...sets.map((set) => set.seconds ?? 0)), bar: null };
}

/** Sessions that have working sets, oldest first, as chart points. */
export function chartPoints(sessions: readonly CountingSession[], kind: ExerciseKind): ChartPoint[] {
  return sessions.map((session) => pointForSession(session, kind)).sort((a, b) => a.startedAt - b.startedAt);
}

/** The earliest start time shown for a range; null means everything. */
export function rangeStart(range: RangeKey, now: number): number | null {
  if (range === 'all') return null;
  const start = new Date(now);
  if (range === '3m') start.setMonth(start.getMonth() - 3);
  else start.setFullYear(start.getFullYear() - 1);
  return start.getTime();
}

export function inRange<T extends { startedAt: number }>(items: readonly T[], range: RangeKey, now: number): T[] {
  const start = rangeStart(range, now);
  return start === null ? [...items] : items.filter((item) => item.startedAt >= start);
}

export interface ProgressView {
  /** Sessions in the range, newest first. */
  sessions: CountingSession[];
  points: ChartPoint[];
  /** Best set over every loaded session, not just the range. */
  best: Best | null;
}

export function buildProgressView(
  history: readonly ExerciseSession[],
  kind: ExerciseKind,
  range: RangeKey,
  now: number,
): ProgressView {
  const counting = countingSessions(history, kind);
  const sessions = inRange(counting, range, now);
  return { sessions, points: chartPoints(sessions, kind), best: bestSoFar(counting, kind) };
}
