import type { Exercise, ExerciseCategory, ExerciseKind, SetStyle } from '../../store';
import { DEFAULT_REP_RANGE } from '../../store/exerciseRules';

/** What the edit form holds while the owner types: numbers stay text until Save. */
export interface ExerciseDraft {
  name: string;
  kind: ExerciseKind;
  category: ExerciseCategory;
  setStyle: SetStyle;
  repMin: string;
  repMax: string;
  weightStepLb: string;
  warmupSets: string;
  restSeconds: string;
}

export function toDraft(exercise: Exercise): ExerciseDraft {
  return {
    name: exercise.name,
    kind: exercise.kind,
    category: exercise.category,
    setStyle: exercise.setStyle,
    repMin: String(exercise.repMin),
    repMax: String(exercise.repMax),
    weightStepLb: String(exercise.weightStepLb),
    warmupSets: String(exercise.warmupSets),
    restSeconds: String(exercise.restSeconds),
  };
}

/** Changing the type moves the rep range to the new type's default, but only if it was still the old default. */
export function withCategory(draft: ExerciseDraft, category: ExerciseCategory): ExerciseDraft {
  const [oldMin, oldMax] = DEFAULT_REP_RANGE[draft.category];
  const rangeUntouched = Number(draft.repMin) === oldMin && Number(draft.repMax) === oldMax;
  if (!rangeUntouched) return { ...draft, category };
  const [repMin, repMax] = DEFAULT_REP_RANGE[category];
  return { ...draft, category, repMin: String(repMin), repMax: String(repMax) };
}

/** The values to pass to updateExercise; the store validates them. */
export function toPatch(draft: ExerciseDraft) {
  return {
    name: draft.name,
    kind: draft.kind,
    category: draft.category,
    setStyle: draft.setStyle,
    repMin: Number(draft.repMin),
    repMax: Number(draft.repMax),
    weightStepLb: Number(draft.weightStepLb),
    warmupSets: Number(draft.warmupSets),
    restSeconds: Number(draft.restSeconds),
  };
}
