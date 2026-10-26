import { getGuide, type Guide } from '../../engine';
import { getExercise, getExerciseHistory, listSets } from '../../store';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../store';
import { getWorkoutEntry } from '../data/workoutData';

export type GuideStatus = 'ok' | 'history-failed' | 'unavailable';

export interface LoadedExercise {
  entry: WorkoutExercise;
  exercise: Exercise;
  sets: WorkoutSet[];
  guide: Guide;
  guideStatus: GuideStatus;
}

/** What the guide says when it can't be built: nothing known, so logging falls back to the last set entered. */
export const EMPTY_GUIDE: Guide = { firstTime: true, last: null, best: null, target: null, warmups: [], stall: null };

/** A missing entry (finished or removed workout) is 'missing': the caller redirects home. */
export async function loadExercise(workoutExerciseId: string): Promise<LoadedExercise | 'missing'> {
  const entry = await getWorkoutEntry(workoutExerciseId);
  if (!entry) return 'missing';
  const exercise = await getExercise(entry.exerciseId);
  const sets = await listSets(entry.id);

  let history;
  try {
    history = await getExerciseHistory(exercise.id);
  } catch (error) {
    console.error('GymBro: could not load history for the guide', error);
    return { entry, exercise, sets, guide: EMPTY_GUIDE, guideStatus: 'history-failed' };
  }
  try {
    return { entry, exercise, sets, guide: getGuide(exercise, history, { isMainLift: entry.isMainLift }), guideStatus: 'ok' };
  } catch (error) {
    console.error('GymBro: the guide failed', error);
    return { entry, exercise, sets, guide: EMPTY_GUIDE, guideStatus: 'unavailable' };
  }
}
