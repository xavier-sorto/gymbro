import { MUSCLES, type Exercise, type Muscle } from '../store/types';

export { MUSCLES };
export type { Muscle };

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  rearDelts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
};

export interface ExerciseMuscles {
  primary: Muscle | null;
  secondary: Muscle[];
}

/**
 * The starter exercises' muscles. Exercises saved before muscles existed have none stored, so
 * these apply until the owner sets their own. Shoulders means the front and side delts.
 */
export const SEED_MUSCLES: Record<string, { primary: Muscle; secondary?: Muscle[] }> = {
  'seed-ex-db-bench': { primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'seed-ex-incline-db-press': { primary: 'chest', secondary: ['shoulders', 'triceps'] },
  'seed-ex-cable-fly': { primary: 'chest' },
  'seed-ex-dips': { primary: 'chest', secondary: ['triceps', 'shoulders'] },
  'seed-ex-overhead-press': { primary: 'shoulders', secondary: ['triceps'] },
  'seed-ex-lateral-raise': { primary: 'shoulders' },
  'seed-ex-rear-delt-fly': { primary: 'rearDelts' },
  'seed-ex-barbell-row': { primary: 'back', secondary: ['biceps', 'rearDelts'] },
  'seed-ex-seated-cable-row': { primary: 'back', secondary: ['biceps', 'rearDelts'] },
  'seed-ex-lat-pulldown': { primary: 'back', secondary: ['biceps'] },
  'seed-ex-pull-up': { primary: 'back', secondary: ['biceps'] },
  'seed-ex-barbell-curl': { primary: 'biceps' },
  'seed-ex-hammer-curl': { primary: 'biceps', secondary: ['forearms'] },
  'seed-ex-wrist-curl': { primary: 'forearms' },
  'seed-ex-triceps-pushdown': { primary: 'triceps' },
  'seed-ex-overhead-triceps-extension': { primary: 'triceps' },
  'seed-ex-back-squat': { primary: 'quads', secondary: ['glutes'] },
  'seed-ex-leg-press': { primary: 'quads', secondary: ['glutes'] },
  'seed-ex-leg-extension': { primary: 'quads' },
  'seed-ex-romanian-deadlift': { primary: 'hamstrings', secondary: ['glutes', 'back'] },
  'seed-ex-leg-curl': { primary: 'hamstrings' },
  'seed-ex-standing-calf-raise': { primary: 'calves' },
  'seed-ex-plank': { primary: 'abs' },
};

type MuscleFields = Pick<Exercise, 'id' | 'primaryMuscle' | 'secondaryMuscles'>;

/**
 * What the owner set wins, including clearing it (null). With nothing stored the starter table
 * applies, and anything else has no muscles until set.
 */
export function musclesOf(exercise: MuscleFields): ExerciseMuscles {
  if (exercise.primaryMuscle !== undefined) {
    return { primary: exercise.primaryMuscle, secondary: exercise.secondaryMuscles ?? [] };
  }
  const seed = SEED_MUSCLES[exercise.id];
  return seed ? { primary: seed.primary, secondary: seed.secondary ?? [] } : { primary: null, secondary: [] };
}
