import type { Exercise } from '../../store';

/** Exercises whose name contains the typed text, ignoring case; everything when nothing is typed. */
export function filterExercisesByName(exercises: Exercise[], query: string): Exercise[] {
  const typed = query.trim().toLowerCase();
  return typed ? exercises.filter((exercise) => exercise.name.toLowerCase().includes(typed)) : exercises;
}
