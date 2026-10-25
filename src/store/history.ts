import { getDb } from './db';
import type { WorkoutSet } from './types';

export interface ExerciseSession {
  workoutId: string;
  startedAt: number;
  isMainLift: boolean;
  sets: WorkoutSet[];
}

const DEFAULT_SESSIONS = 10;

async function exerciseIdsIncludingMerged(exerciseId: string): Promise<string[]> {
  const merged = await getDb().exercises.filter((exercise) => exercise.mergedInto === exerciseId).primaryKeys();
  return [exerciseId, ...merged];
}

function groupByWorkout(sets: WorkoutSet[]): Map<string, WorkoutSet[]> {
  const groups = new Map<string, WorkoutSet[]>();
  for (const set of sets) groups.set(set.workoutId, [...(groups.get(set.workoutId) ?? []), set]);
  return groups;
}

/** Past finished workouts that include the exercise (and exercises merged into it), newest first. */
export async function getExerciseHistory(
  exerciseId: string,
  options: { sessions?: number } = {},
): Promise<ExerciseSession[]> {
  const { sessions = DEFAULT_SESSIONS } = options;
  const db = getDb();
  const ids = await exerciseIdsIncludingMerged(exerciseId);
  const sets = (
    await Promise.all(
      ids.map((id) => db.sets.where('[exerciseId+savedAt]').between([id, -Infinity], [id, Infinity]).toArray()),
    )
  )
    .flat()
    .filter((set) => !set.deleted);
  const setsByWorkout = groupByWorkout(sets);
  const workouts = (await db.workouts.bulkGet([...setsByWorkout.keys()]))
    .filter((workout) => workout && !workout.deleted && workout.finishedAt !== null)
    .sort((a, b) => (b?.startedAt ?? 0) - (a?.startedAt ?? 0))
    .slice(0, sessions);

  const result: ExerciseSession[] = [];
  for (const workout of workouts) {
    if (!workout) continue;
    const entries = await db.workoutExercises.where('workoutId').equals(workout.id).toArray();
    const entry = entries.find((e) => !e.deleted && ids.includes(e.exerciseId));
    const ordered = (setsByWorkout.get(workout.id) ?? []).sort((a, b) => a.order - b.order || a.savedAt - b.savedAt);
    result.push({ workoutId: workout.id, startedAt: workout.startedAt, isMainLift: entry?.isMainLift ?? false, sets: ordered });
  }
  return result;
}
