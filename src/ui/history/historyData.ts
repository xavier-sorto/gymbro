import { bestSoFar, compareBest, countingSessions, type BestChange } from '../../engine';
import { getDb } from '../../store/db';
import { getExerciseHistory, listExercises, listSets, listWorkouts } from '../../store';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../../store';
import { listWorkoutEntries } from '../data/workoutData';
import { formatWeekdayDate, pluralSets } from '../format';
import { summarize, type HistoryStats } from './historyStats';

export const HISTORY_PAGE_SIZE = 50;

/** Every day type, deleted ones too, so past workouts keep their names. */
const listAllDayTypes = () => getDb().dayTypes.toArray();
export const UNNAMED_WORKOUT = 'Workout';

export interface HistoryRowData {
  workout: Workout;
  title: string;
  workingSets: number;
  /** Every logged set including warm-ups: what deleting the workout removes. */
  totalSets: number;
  exerciseNames: string[];
}

export interface HistoryPage {
  rows: HistoryRowData[];
  hasMore: boolean;
}

export interface DetailExercise {
  entry: WorkoutExercise;
  exercise: Exercise | undefined;
  sets: WorkoutSet[];
  /** Best set against the previous time the exercise was done, or null when there is nothing to compare. */
  change: BestChange | null;
}

export interface WorkoutDetail {
  workout: Workout;
  title: string;
  exercises: DetailExercise[];
}

export const deleteWorkoutMessage = (title: string, startedAt: number, totalSets: number) =>
  `${title}, ${formatWeekdayDate(startedAt)}: all ${pluralSets(totalSets)} will be deleted. This can't be undone.`;

export const countWorking = (sets: WorkoutSet[]) => sets.filter((set) => !set.isWarmup).length;

async function loadExercisesWithSets(workoutId: string, allExercises: Exercise[]): Promise<DetailExercise[]> {
  const entries = await listWorkoutEntries(workoutId);
  const withSets = await Promise.all(
    entries.map(async (entry) => ({
      entry,
      exercise: allExercises.find((exercise) => exercise.id === entry.exerciseId),
      sets: await listSets(entry.id),
      change: null,
    })),
  );
  return withSets.filter(({ sets }) => sets.length > 0);
}

/** One page of finished workouts, newest first, starting after `before` (a workout start time). */
export async function loadHistoryPage(before?: number): Promise<HistoryPage> {
  const [workouts, dayTypes, exercises] = await Promise.all([
    listWorkouts({ limit: HISTORY_PAGE_SIZE, before }),
    listAllDayTypes(),
    listExercises(),
  ]);
  const rows = await Promise.all(
    workouts.map(async (workout) => {
      const done = await loadExercisesWithSets(workout.id, exercises);
      return {
        workout,
        title: dayTypes.find((dayType) => dayType.id === workout.dayTypeId)?.name ?? UNNAMED_WORKOUT,
        workingSets: done.reduce((total, { sets }) => total + countWorking(sets), 0),
        totalSets: done.reduce((total, { sets }) => total + sets.length, 0),
        exerciseNames: done.map(({ exercise }) => exercise?.name ?? 'Unknown exercise'),
      };
    }),
  );
  return { rows, hasMore: workouts.length === HISTORY_PAGE_SIZE };
}

/** This week's workouts and volume plus the weekly streak, from every finished workout. */
export async function loadHistoryStats(now = Date.now()): Promise<HistoryStats> {
  const db = getDb();
  const workouts = await db.workouts.filter((workout) => !workout.deleted && workout.finishedAt !== null).toArray();
  const volumeByWorkout = new Map<string, number>();
  for (const set of await db.sets.filter((set) => !set.deleted && !set.isWarmup).toArray()) {
    volumeByWorkout.set(set.workoutId, (volumeByWorkout.get(set.workoutId) ?? 0) + (set.weightLb ?? 0) * (set.reps ?? 0));
  }
  return summarize(
    workouts.map((workout) => ({ startedAt: workout.startedAt, volumeLb: volumeByWorkout.get(workout.id) ?? 0 })),
    now,
  );
}

/** Past sessions looked at to find the one before this workout. */
const COMPARE_SESSIONS = 500;

async function changeSinceLast(workout: Workout, { exercise, sets }: DetailExercise): Promise<BestChange | null> {
  if (!exercise) return null;
  const { kind } = exercise;
  const today = bestSoFar(countingSessions([{ workoutId: workout.id, startedAt: workout.startedAt, isMainLift: false, sets }], kind), kind);
  const history = await getExerciseHistory(exercise.id, { sessions: COMPARE_SESSIONS });
  const previous = history.find((session) => session.startedAt < workout.startedAt);
  const before = previous && bestSoFar(countingSessions([previous], kind), kind);
  return today && before ? compareBest(kind, today, before) : null;
}

export const MISSING_WORKOUT = 'missing';

/** One finished workout with its exercises and sets, or MISSING_WORKOUT when it is gone, deleted or unfinished. */
export async function loadWorkoutDetail(workoutId: string): Promise<WorkoutDetail | typeof MISSING_WORKOUT> {
  const workout = await getDb().workouts.get(workoutId);
  if (!workout || workout.deleted || workout.finishedAt === null) return MISSING_WORKOUT;
  const [dayTypes, exercises] = await Promise.all([listAllDayTypes(), listExercises()]);
  return {
    workout,
    title: dayTypes.find((dayType) => dayType.id === workout.dayTypeId)?.name ?? UNNAMED_WORKOUT,
    exercises: await Promise.all(
      (await loadExercisesWithSets(workoutId, exercises)).map(async (item) => ({ ...item, change: await changeSinceLast(workout, item) })),
    ),
  };
}
