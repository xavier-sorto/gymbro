import { getGuide, type Guide } from '../../engine';
import { getExercise, getExerciseHistory, listSets } from '../../store';
import { getSettings } from '../settings/settings';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../store';
import { getWorkoutEntry, listWorkoutEntries } from '../data/workoutData';

export interface NextExercise {
  entryId: string;
  name: string;
}

export type GuideStatus = 'ok' | 'history-failed' | 'unavailable';

export interface LoadedExercise {
  entry: WorkoutExercise;
  exercise: Exercise;
  sets: WorkoutSet[];
  guide: Guide;
  guideStatus: GuideStatus;
  /** The exercise after this one in the workout, null on the last one. */
  next: NextExercise | null;
}

/** What the guide says when it can't be built: nothing known, so logging falls back to the last set entered. */
export const EMPTY_GUIDE: Guide = { firstTime: true, last: null, best: null, target: null, warmups: [], stall: null };

async function findNext(entry: WorkoutExercise): Promise<NextExercise | null> {
  try {
    const entries = await listWorkoutEntries(entry.workoutId);
    const following = entries[entries.findIndex((other) => other.id === entry.id) + 1];
    return following ? { entryId: following.id, name: (await getExercise(following.exerciseId)).name } : null;
  } catch (error) {
    console.error('GymBro: could not find the next exercise', error);
    return null;
  }
}

/** A missing entry (finished or removed workout) is 'missing': the caller redirects home. */
export async function loadExercise(workoutExerciseId: string): Promise<LoadedExercise | 'missing'> {
  const entry = await getWorkoutEntry(workoutExerciseId);
  if (!entry) return 'missing';
  const exercise = await getExercise(entry.exerciseId);
  const sets = await listSets(entry.id);
  const next = await findNext(entry);

  let history;
  try {
    history = await getExerciseHistory(exercise.id);
  } catch (error) {
    console.error('GymBro: could not load history for the guide', error);
    return { entry, exercise, sets, guide: EMPTY_GUIDE, guideStatus: 'history-failed', next };
  }
  try {
    return { entry, exercise, sets, guide: getGuide(exercise, history, { isMainLift: entry.isMainLift, warmups: getSettings().warmupSuggestions }), guideStatus: 'ok', next };
  } catch (error) {
    console.error('GymBro: the guide failed', error);
    return { entry, exercise, sets, guide: EMPTY_GUIDE, guideStatus: 'unavailable', next };
  }
}
