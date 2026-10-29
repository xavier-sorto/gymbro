import { bestSoFar, compareBest, countingSessions, getGuide, musclesOf, targetFor, type Best, type BestChange, type Muscle, type PlannedSet } from '../../engine';
import { getDb } from '../../store/db';
import { getExerciseHistory, listExercises, listSets, listWorkouts } from '../../store';
import type { Exercise, Workout, WorkoutExercise, WorkoutSet } from '../../store';
import { listWorkoutEntries } from '../data/workoutData';
import { formatWeekdayDate, pluralSets } from '../format';
import { getSettings } from '../settings/settings';
import { loadWeeklyVolume } from '../volume/volumeData';
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
  /** The best set of this workout, null when it had no working sets. */
  best: Best | null;
  /** True when that beat the best of every earlier workout. A first time is not a record. */
  isRecord: boolean;
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
      best: null,
      isRecord: false,
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

/** How this workout's best set compares with the last time and with every earlier time. */
async function compareWithHistory(workout: Workout, { exercise, sets }: DetailExercise) {
  if (!exercise) return { change: null, best: null, isRecord: false };
  const { kind } = exercise;
  const best = bestSoFar(countingSessions([{ workoutId: workout.id, startedAt: workout.startedAt, isMainLift: false, sets }], kind), kind);
  const history = await getExerciseHistory(exercise.id, { sessions: COMPARE_SESSIONS });
  const earlier = history.filter((session) => session.startedAt < workout.startedAt);
  const previous = earlier[0];
  const before = previous && bestSoFar(countingSessions([previous], kind), kind);
  const bestEver = bestSoFar(countingSessions(earlier, kind), kind);
  return {
    change: best && before ? compareBest(kind, best, before) : null,
    best,
    isRecord: best !== null && bestEver !== null && compareBest(kind, best, bestEver).value > 0,
  };
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
      (await loadExercisesWithSets(workoutId, exercises)).map(async (item) => ({ ...item, ...(await compareWithHistory(workout, item)) })),
    ),
  };
}

/** Pounds lifted: weight times reps over the working sets. Bodyweight and timed sets add nothing. */
export const volumeOf = (sets: readonly WorkoutSet[]) =>
  sets.filter((set) => !set.isWarmup).reduce((total, set) => total + (set.weightLb ?? 0) * (set.reps ?? 0), 0);

export interface NextTimeLine {
  name: string;
  kind: Exercise['kind'];
  /** The sets the guide will suggest the next time this exercise is done. */
  target: PlannedSet[];
}

export interface WeekLine {
  muscle: Muscle;
  /** Working sets so far in the workout's week, this workout included. */
  sets: number;
  /** The low end of the weekly range. */
  goal: number;
}

export interface WorkoutSummary {
  detail: WorkoutDetail;
  nextTime: NextTimeLine[];
  week: WeekLine[];
  workingSets: number;
  volumeLb: number;
  /** The workout of the same day type before this one, for comparing volume. */
  previous: { startedAt: number; volumeLb: number } | null;
}

async function volumeOfWorkout(workoutId: string): Promise<number> {
  const entries = await listWorkoutEntries(workoutId);
  return volumeOf((await Promise.all(entries.map((entry) => listSets(entry.id)))).flat());
}

async function nextTimeLines(exercises: readonly DetailExercise[]): Promise<NextTimeLine[]> {
  const lines = await Promise.all(
    exercises.map(async ({ exercise, sets }): Promise<NextTimeLine[]> => {
      if (!exercise || countWorking(sets) === 0) return [];
      try {
        const guide = getGuide(exercise, await getExerciseHistory(exercise.id), { isMainLift: false, warmups: false });
        return guide.target ? [{ name: exercise.name, kind: exercise.kind, target: guide.target.sets }] : [];
      } catch (error) {
        console.error('GymBro: could not work out next time for the summary', error);
        return [];
      }
    }),
  );
  return lines.flat();
}

/** The muscles this workout trained, with how far each is toward its weekly range, furthest behind first. */
async function weekLines(exercises: readonly DetailExercise[], startedAt: number): Promise<WeekLine[]> {
  try {
    const trained = new Set<Muscle>(
      exercises.flatMap(({ exercise, sets }) => {
        const primary = exercise && countWorking(sets) > 0 ? musclesOf(exercise).primary : null;
        return primary ? [primary] : [];
      }),
    );
    if (trained.size === 0) return [];
    const volume = await loadWeeklyVolume(0, startedAt);
    const scale = getSettings().volumeTargets;
    return [...trained]
      .map((muscle) => ({ muscle, sets: volume.byMuscle[muscle].sets, goal: targetFor(muscle, scale).low }))
      .sort((a, b) => b.goal - b.sets - (a.goal - a.sets))
      .slice(0, 4);
  } catch (error) {
    console.error('GymBro: could not work out the weekly progress for the summary', error);
    return [];
  }
}

/** A finished workout's totals, how its volume compares with last time, and its records. */
export async function loadWorkoutSummary(workoutId: string): Promise<WorkoutSummary | typeof MISSING_WORKOUT> {
  const detail = await loadWorkoutDetail(workoutId);
  if (detail === MISSING_WORKOUT) return MISSING_WORKOUT;
  const { workout } = detail;
  const sets = detail.exercises.flatMap(({ sets: exerciseSets }) => exerciseSets);
  const earlier =
    workout.dayTypeId === null
      ? undefined
      : await getDb()
          .workouts.where('startedAt')
          .below(workout.startedAt)
          .reverse()
          .filter((other) => !other.deleted && other.finishedAt !== null && other.dayTypeId === workout.dayTypeId)
          .first();
  return {
    detail,
    nextTime: await nextTimeLines(detail.exercises),
    week: await weekLines(detail.exercises, workout.startedAt),
    workingSets: countWorking(sets),
    volumeLb: volumeOf(sets),
    previous: earlier ? { startedAt: earlier.startedAt, volumeLb: await volumeOfWorkout(earlier.id) } : null,
  };
}
