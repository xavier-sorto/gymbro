import type { DayType, Exercise } from '../store/types';

export interface DayListEntry {
  exerciseId: string;
  isMainLift: boolean;
}

type ExerciseRef = Pick<Exercise, 'deleted' | 'mergedInto'>;

/** The day's exercises in order: merges resolved, deleted and repeated ones dropped. */
export function buildDayList(
  dayType: Pick<DayType, 'exerciseIds' | 'mainLiftIds'>,
  exercisesById: Readonly<Record<string, ExerciseRef | undefined>>,
): DayListEntry[] {
  const mainLifts = new Set(dayType.mainLiftIds);
  const seen = new Set<string>();
  const list: DayListEntry[] = [];
  for (const id of dayType.exerciseIds) {
    const exercise = exercisesById[id];
    if (exercise?.deleted) continue;
    const resolvedId = exercise?.mergedInto ?? id;
    if (seen.has(resolvedId) || exercisesById[resolvedId]?.deleted) continue;
    seen.add(resolvedId);
    list.push({ exerciseId: resolvedId, isMainLift: mainLifts.has(id) || mainLifts.has(resolvedId) });
  }
  return list;
}
