import type { PlannedSet } from '../../engine';
import type { Exercise, NewSetInput } from '../../store';

/** The next-set row's fields as text, so a half-typed number is never lost. */
export interface SetDraft {
  weightLb: string;
  reps: string;
  seconds: string;
  isWarmup: boolean;
}

const asText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/** A draft from the planned set; with no plan, a blank row starting at the bottom of the rep range. */
export function draftFromPlan(plan: PlannedSet | null, exercise: Pick<Exercise, 'kind' | 'repMin'>): SetDraft {
  if (plan) {
    return { weightLb: asText(plan.weightLb), reps: asText(plan.reps), seconds: asText(plan.seconds), isWarmup: plan.isWarmup };
  }
  return {
    weightLb: exercise.kind === 'weighted' ? '0' : '',
    reps: exercise.kind === 'timed' ? '' : String(exercise.repMin),
    seconds: exercise.kind === 'timed' ? '30' : '',
    isWarmup: false,
  };
}

const toNumber = (text: string) => (text.trim() === '' ? null : Number(text));

/** The values to store for the draft; fields the kind doesn't use are left out. */
export function draftToInput(kind: Exercise['kind'], draft: SetDraft): Omit<NewSetInput, 'workoutExerciseId'> {
  if (kind === 'timed') return { isWarmup: draft.isWarmup, seconds: toNumber(draft.seconds) };
  if (kind === 'bodyweight') return { isWarmup: draft.isWarmup, reps: toNumber(draft.reps) };
  return { isWarmup: draft.isWarmup, reps: toNumber(draft.reps), weightLb: toNumber(draft.weightLb) };
}
