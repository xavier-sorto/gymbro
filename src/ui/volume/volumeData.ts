import { weeklyVolume, type WeeklyVolume } from '../../engine';
import { getDb } from '../../store/db';
import { weekStart } from '../history/historyStats';

/** Monday midnight to the next Monday midnight, for the week `weeksAgo` weeks before the current one. */
export function weekRange(weeksAgo: number, now: number): { start: number; end: number } {
  const start = new Date(weekStart(now));
  start.setDate(start.getDate() - 7 * weeksAgo);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

/** One week's working sets by muscle: warm-ups and deleted records left out, merged exercises counted as their target. */
export async function loadWeeklyVolume(weeksAgo: number, now = Date.now()): Promise<WeeklyVolume> {
  const { start, end } = weekRange(weeksAgo, now);
  const db = getDb();
  const workouts = await db.workouts
    .where('startedAt')
    .between(start, end, true, false)
    .filter((workout) => !workout.deleted)
    .toArray();
  const inWeek = new Set(workouts.map((workout) => workout.id));
  const [sets, exercises] = await Promise.all([
    db.sets.filter((set) => !set.deleted && !set.isWarmup && inWeek.has(set.workoutId)).toArray(),
    db.exercises.toArray(),
  ]);
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const resolve = (id: string) => {
    const exercise = byId.get(id);
    return (exercise?.mergedInto ? byId.get(exercise.mergedInto) : undefined) ?? exercise ?? null;
  };
  return weeklyVolume(sets.map((set) => ({ workoutId: set.workoutId, exercise: resolve(set.exerciseId) })));
}
