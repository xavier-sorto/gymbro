import { bestDayType, muscleGaps, type DayTypeFit, type MuscleGap } from '../../engine';
import { listDayTypes, listExercises } from '../../store';
import type { DayType } from '../../store';
import { getDb } from '../../store/db';
import { getSettings } from '../settings/settings';
import { loadWeeklyVolume } from './volumeData';

export interface Suggestion {
  /** The muscles furthest behind this week, biggest gap first. */
  behind: MuscleGap[];
  totalMissing: number;
  /** The day type that would fill the most, or null when none of them would fill anything. */
  fit: (DayTypeFit & { dayType: DayType }) | null;
}

/** What this week still needs. Null with no finished workout yet, since there is nothing to judge from. */
export async function loadSuggestion(now = Date.now()): Promise<Suggestion | null> {
  const anyWorkout = await getDb()
    .workouts.filter((workout) => !workout.deleted && workout.finishedAt !== null)
    .first();
  if (!anyWorkout) return null;
  const [volume, dayTypes, exercises] = await Promise.all([loadWeeklyVolume(0, now), listDayTypes(), listExercises()]);
  const gaps = muscleGaps(volume.byMuscle, getSettings().volumeTargets);
  const fit = bestDayType(gaps, dayTypes, new Map(exercises.map((exercise) => [exercise.id, exercise])));
  const dayType = fit && dayTypes.find((candidate) => candidate.id === fit.dayTypeId);
  return {
    behind: gaps.slice(0, 3),
    totalMissing: gaps.reduce((total, gap) => total + gap.missing, 0),
    fit: fit && dayType ? { ...fit, dayType } : null,
  };
}
