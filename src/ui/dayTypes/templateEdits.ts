import type { DayType } from '../../store';

export type TemplateLists = Pick<DayType, 'exerciseIds' | 'mainLiftIds'>;

/** Swaps the exercise at `index` with its neighbour; out-of-range moves change nothing. */
export function moveExercise(lists: TemplateLists, index: number, direction: -1 | 1): TemplateLists {
  const target = index + direction;
  if (index < 0 || target < 0 || index >= lists.exerciseIds.length || target >= lists.exerciseIds.length) return lists;
  const exerciseIds = [...lists.exerciseIds];
  [exerciseIds[index], exerciseIds[target]] = [exerciseIds[target]!, exerciseIds[index]!];
  return { ...lists, exerciseIds };
}

/** Removes an exercise and, with it, its main-lift mark (a main lift must be in the list). */
export function removeExercise(lists: TemplateLists, exerciseId: string): TemplateLists {
  return {
    exerciseIds: lists.exerciseIds.filter((id) => id !== exerciseId),
    mainLiftIds: lists.mainLiftIds.filter((id) => id !== exerciseId),
  };
}

/** Appends an exercise unless the template already has it. */
export function appendExercise(lists: TemplateLists, exerciseId: string): TemplateLists {
  return lists.exerciseIds.includes(exerciseId) ? lists : { ...lists, exerciseIds: [...lists.exerciseIds, exerciseId] };
}

export function toggleMainLift(lists: TemplateLists, exerciseId: string): TemplateLists {
  const isMain = lists.mainLiftIds.includes(exerciseId);
  return {
    ...lists,
    mainLiftIds: isMain ? lists.mainLiftIds.filter((id) => id !== exerciseId) : [...lists.mainLiftIds, exerciseId],
  };
}
