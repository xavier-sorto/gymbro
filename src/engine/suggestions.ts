import { MUSCLES, type Exercise, type Muscle } from '../store/types';
import { musclesOf } from './muscles';
import { targetFor, type TargetScale } from './muscleTargets';
import { SECONDARY_WEIGHT, type MuscleWeek } from './weeklyVolume';

/** How many sets a day type is assumed to give each of its exercises, for estimating what it would fill. */
export const PLANNED_SETS_PER_EXERCISE = 3;

export interface MuscleGap {
  muscle: Muscle;
  /** Working sets so far this week. */
  sets: number;
  /** The low end of the weekly range, where the muscle counts as well fed. */
  goal: number;
  missing: number;
}

/** Muscles still short of the low end of their weekly range, the biggest gap first. */
export function muscleGaps(byMuscle: Record<Muscle, MuscleWeek>, scale: TargetScale = 'standard'): MuscleGap[] {
  return MUSCLES.map((muscle) => {
    const goal = targetFor(muscle, scale).low;
    return { muscle, sets: byMuscle[muscle].sets, goal, missing: goal - byMuscle[muscle].sets };
  })
    .filter((gap) => gap.missing > 0)
    .sort((a, b) => b.missing - a.missing);
}

export interface DayTypeFit {
  dayTypeId: string;
  /** Roughly how many of the missing sets this day type would fill. */
  covers: number;
  /** The muscles it helps most, biggest first. */
  muscles: Muscle[];
}

type ExerciseMuscleFields = Pick<Exercise, 'id' | 'primaryMuscle' | 'secondaryMuscles'>;

/**
 * The day type that would fill the most missing sets, assuming PLANNED_SETS_PER_EXERCISE per exercise
 * (half for helper muscles). Null when none would fill anything. A tie goes to the earlier day type.
 */
export function bestDayType(
  gaps: readonly MuscleGap[],
  dayTypes: readonly { id: string; exerciseIds: readonly string[] }[],
  exercises: ReadonlyMap<string, ExerciseMuscleFields>,
): DayTypeFit | null {
  let best: DayTypeFit | null = null;
  for (const dayType of dayTypes) {
    const planned = new Map<Muscle, number>();
    const add = (muscle: Muscle, sets: number) => planned.set(muscle, (planned.get(muscle) ?? 0) + sets);
    for (const id of dayType.exerciseIds) {
      const exercise = exercises.get(id);
      const { primary, secondary } = exercise ? musclesOf(exercise) : { primary: null, secondary: [] };
      if (!primary) continue;
      add(primary, PLANNED_SETS_PER_EXERCISE);
      for (const muscle of secondary.filter((other) => other !== primary)) add(muscle, PLANNED_SETS_PER_EXERCISE * SECONDARY_WEIGHT);
    }
    const filled = gaps
      .map((gap) => ({ muscle: gap.muscle, amount: Math.min(gap.missing, planned.get(gap.muscle) ?? 0) }))
      .filter((fill) => fill.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const covers = filled.reduce((total, fill) => total + fill.amount, 0);
    if (covers > (best?.covers ?? 0)) {
      best = { dayTypeId: dayType.id, covers, muscles: filled.slice(0, 3).map((fill) => fill.muscle) };
    }
  }
  return best;
}
