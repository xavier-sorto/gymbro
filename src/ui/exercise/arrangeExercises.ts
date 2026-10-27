import type { Exercise } from '../../store';

/** Favorites first, then the rest, then archived ones (only when asked for). Order within each group is kept. */
export function arrangeExercises(exercises: readonly Exercise[], showArchived: boolean): Exercise[] {
  const live = exercises.filter((exercise) => !exercise.archived);
  const arranged = [...live.filter((exercise) => exercise.favorite), ...live.filter((exercise) => !exercise.favorite)];
  return showArchived ? [...arranged, ...exercises.filter((exercise) => exercise.archived)] : arranged;
}

/** The Library heading an exercise sits under. */
export const groupLabel = (exercise: Exercise): string =>
  exercise.archived ? 'Archived' : exercise.favorite ? 'Favorites' : exercise.name.charAt(0).toUpperCase();
