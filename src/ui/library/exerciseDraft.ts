import { musclesOf } from '../../engine';
import type { Exercise, ExerciseCategory, ExerciseKind, Muscle, SetStyle } from '../../store';
import { DEFAULT_REP_RANGE } from '../../store/exerciseRules';

/** The muscle choice, shared by the new-exercise form and the edit form. */
export interface MuscleDraft {
  primaryMuscle: Muscle | null;
  secondaryMuscles: Muscle[];
}

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
  notes: string;
  favorite: boolean;
  archived: boolean;
  primaryMuscle: Muscle | null;
  secondaryMuscles: Muscle[];
}

/** Most muscles an exercise can list as secondary. */
export const MAX_SECONDARY_MUSCLES = 4;

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
    notes: exercise.notes ?? '',
    favorite: exercise.favorite ?? false,
    archived: exercise.archived ?? false,
    primaryMuscle: musclesOf(exercise).primary,
    secondaryMuscles: musclesOf(exercise).secondary,
  };
}

/** Choosing the main muscle takes it out of the secondary list; choosing none empties that list. */
export function withPrimaryMuscle<T extends MuscleDraft>(draft: T, primaryMuscle: Muscle | null): T {
  return {
    ...draft,
    primaryMuscle,
    secondaryMuscles: primaryMuscle === null ? [] : draft.secondaryMuscles.filter((muscle) => muscle !== primaryMuscle),
  };
}

/** Adds or removes a secondary muscle; adding past the limit does nothing. */
export function withSecondaryToggled<T extends MuscleDraft>(draft: T, muscle: Muscle): T {
  if (draft.secondaryMuscles.includes(muscle)) {
    return { ...draft, secondaryMuscles: draft.secondaryMuscles.filter((other) => other !== muscle) };
  }
  if (draft.secondaryMuscles.length >= MAX_SECONDARY_MUSCLES) return draft;
  return { ...draft, secondaryMuscles: [...draft.secondaryMuscles, muscle] };
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
    notes: draft.notes,
    favorite: draft.favorite,
    archived: draft.archived,
    primaryMuscle: draft.primaryMuscle,
    secondaryMuscles: draft.secondaryMuscles,
  };
}
