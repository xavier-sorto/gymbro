import { describe, expect, it } from 'vitest';
import { MUSCLES, bestDayType, muscleGaps, type MuscleWeek } from '../../src/engine';
import type { Muscle } from '../../src/store';

const week = (sets: Partial<Record<Muscle, number>> = {}): Record<Muscle, MuscleWeek> =>
  Object.fromEntries(MUSCLES.map((muscle) => [muscle, { sets: sets[muscle] ?? 0, days: 0 }])) as Record<Muscle, MuscleWeek>;

const ex = (id: string, primaryMuscle: Muscle | null, secondaryMuscles: Muscle[] = []) => ({ id, primaryMuscle, secondaryMuscles });
const library = (...exercises: ReturnType<typeof ex>[]) => new Map(exercises.map((exercise) => [exercise.id, exercise]));

describe('muscleGaps', () => {
  it('lists muscles short of the low end of their range, biggest gap first', () => {
    const gaps = muscleGaps(week({ chest: 10, back: 4, quads: 10 }));
    expect(gaps.find((gap) => gap.muscle === 'chest')).toEqual({ muscle: 'chest', sets: 10, goal: 12, missing: 2 });
    expect(gaps.find((gap) => gap.muscle === 'quads')).toBeUndefined();
    expect(gaps.find((gap) => gap.muscle === 'back')?.missing).toBe(10);
    // shoulders and biceps both miss 12, the most; the earlier muscle in the list comes first
    expect(gaps[0]).toMatchObject({ muscle: 'shoulders', missing: 12 });
    expect(gaps.map((gap) => gap.missing)).toEqual([...gaps.map((gap) => gap.missing)].sort((a, b) => b - a));
  });

  it('is empty when every muscle has reached the low end', () => {
    const full = Object.fromEntries(MUSCLES.map((muscle) => [muscle, 50])) as Record<Muscle, number>;
    expect(muscleGaps(week(full))).toEqual([]);
  });

  it('follows the chosen target size', () => {
    expect(muscleGaps(week({ chest: 10 }), 'lighter').find((gap) => gap.muscle === 'chest')).toBeUndefined();
    expect(muscleGaps(week({ chest: 10 }), 'higher').find((gap) => gap.muscle === 'chest')?.missing).toBe(5);
  });
});

describe('bestDayType', () => {
  const library3 = library(
    ex('bench', 'chest', ['triceps']),
    ex('row', 'back', ['biceps']),
    ex('squat', 'quads', ['glutes']),
    ex('mystery', null),
  );
  const days = [
    { id: 'push', exerciseIds: ['bench'] },
    { id: 'pull', exerciseIds: ['row'] },
    { id: 'legs', exerciseIds: ['squat'] },
  ];

  it('picks the day type that fills the most missing sets', () => {
    // back is far behind, chest a little, quads not at all
    const gaps = muscleGaps(week({ chest: 10, quads: 10, glutes: 8, triceps: 10, biceps: 12 }));
    const fit = bestDayType(gaps, days, library3);
    expect(fit?.dayTypeId).toBe('pull');
    expect(fit?.muscles[0]).toBe('back');
    // 3 planned sets of back, capped by the 14 missing, no help needed for biceps (already 12 of 12)
    expect(fit?.covers).toBe(3);
  });

  it('counts helper muscles at half and never more than what is missing', () => {
    const gaps = muscleGaps(week({ chest: 12, back: 14, quads: 10, glutes: 7, biceps: 12, triceps: 10 }));
    const fit = bestDayType(gaps, [{ id: 'legs', exerciseIds: ['squat', 'squat'] }], library3);
    // glutes miss 1 (low 8, has 7); two squats plan 3 helper sets, so it fills only the 1 missing
    expect(fit?.covers).toBe(1);
    expect(fit?.muscles).toEqual(['glutes']);
  });

  it('keeps the earlier day type on a tie', () => {
    const gaps = muscleGaps(week());
    const same = [{ id: 'a', exerciseIds: ['row'] }, { id: 'b', exerciseIds: ['row'] }];
    expect(bestDayType(gaps, same, library3)?.dayTypeId).toBe('a');
  });

  it('is null when nothing would fill anything', () => {
    expect(bestDayType(muscleGaps(week()), [{ id: 'x', exerciseIds: ['mystery', 'unknown'] }], library3)).toBeNull();
    expect(bestDayType([], days, library3)).toBeNull();
    expect(bestDayType(muscleGaps(week()), [], library3)).toBeNull();
  });
});
