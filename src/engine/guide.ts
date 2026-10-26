import type { ExerciseSession } from '../store/history';
import { bestSoFar } from './best';
import { effectiveSettings, type ExerciseSettings } from './settings';
import { rampingTarget } from './targetRamping';
import { bodyweightTarget, straightTarget, timedTarget } from './targetSimple';
import type { Guide, Target } from './types';
import { warmupsFor } from './warmups';
import { countingSessions, type CountingSession } from './workingSets';

export type GuideExercise = Pick<ExerciseSettings, 'kind' | 'setStyle'> & Partial<ExerciseSettings>;

function targetFor(exercise: GuideExercise, last: CountingSession): Target {
  const settings = effectiveSettings(exercise);
  if (exercise.kind === 'bodyweight') return bodyweightTarget(last.workingSets, settings);
  if (exercise.kind === 'timed') return timedTarget(last.workingSets);
  return exercise.setStyle === 'ramping'
    ? rampingTarget(last.workingSets, settings)
    : straightTarget(last.workingSets, settings);
}

/** Last time, best so far and today's target. `history` is newest first, finished sessions only. */
export function getGuide(
  exercise: GuideExercise,
  history: readonly ExerciseSession[],
  _options: { isMainLift: boolean },
): Guide {
  const sessions = countingSessions(history, exercise.kind);
  const last = sessions[0] ?? null;
  return {
    firstTime: last === null,
    last,
    best: bestSoFar(sessions, exercise.kind),
    target: last ? targetFor(exercise, last) : null,
    warmups: warmupsFor(exercise, null),
    stall: null,
  };
}
