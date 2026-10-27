import { getDb } from '../../store/db';
import { listDayTypes, listExercises, listSets, listWorkouts } from '../../store';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../../store';
import { listWorkoutEntries } from '../data/workoutData';
import { formatWeekdayDate, pluralSets } from '../format';

export const HISTORY_PAGE_SIZE = 50;
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
    })),
  );
  return withSets.filter(({ sets }) => sets.length > 0);
}

/** One page of finished workouts, newest first, starting after `before` (a workout start time). */
export async function loadHistoryPage(before?: number): Promise<HistoryPage> {
  const [workouts, dayTypes, exercises] = await Promise.all([
    listWorkouts({ limit: HISTORY_PAGE_SIZE, before }),
    listDayTypes(),
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

export const MISSING_WORKOUT = 'missing';

/** One finished workout with its exercises and sets, or MISSING_WORKOUT when it is gone, deleted or unfinished. */
export async function loadWorkoutDetail(workoutId: string): Promise<WorkoutDetail | typeof MISSING_WORKOUT> {
  const workout = await getDb().workouts.get(workoutId);
  if (!workout || workout.deleted || workout.finishedAt === null) return MISSING_WORKOUT;
  const [dayTypes, exercises] = await Promise.all([listDayTypes(), listExercises()]);
  return {
    workout,
    title: dayTypes.find((dayType) => dayType.id === workout.dayTypeId)?.name ?? UNNAMED_WORKOUT,
    exercises: await loadExercisesWithSets(workoutId, exercises),
  };
}
