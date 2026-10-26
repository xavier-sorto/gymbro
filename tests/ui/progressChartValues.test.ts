import { describe, expect, it } from 'vitest';
import { buildProgressView, rangeStart } from '../../src/ui/progress-chart/chartValues';
import { layoutChart } from '../../src/ui/progress-chart/chartLayout';
import type { ExerciseSession } from '../../src/store/history';
import type { WorkoutSet } from '../../src/store/types';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 26, 12);

const set = (patch: Partial<WorkoutSet>): WorkoutSet => ({
  id: 's', updatedAt: 0, deleted: false, workoutId: 'w', workoutExerciseId: 'we', exerciseId: 'e',
  order: 0, isWarmup: false, reps: null, weightLb: null, seconds: null, savedAt: 0, ...patch,
});
const session = (daysAgo: number, sets: Partial<WorkoutSet>[]): ExerciseSession => ({
  workoutId: `w${daysAgo}`, startedAt: NOW - daysAgo * DAY, isMainLift: false, sets: sets.map(set),
});

describe('chart values', () => {
  const weighted = [
    session(1, [{ isWarmup: true, weightLb: 20, reps: 10 }, { weightLb: 65, reps: 8 }, { weightLb: 65, reps: 8 }, { weightLb: 65, reps: 7 }]),
    session(8, [{ weightLb: 60, reps: 8 }, { weightLb: 65, reps: 5 }]),
    session(15, [{ weightLb: 55, reps: 10 }]),
  ];

  it('weighted: line is the heaviest working weight and bars are volume, warm-ups excluded', () => {
    const { points, best } = buildProgressView(weighted, 'weighted', 'all', NOW);
    expect(points.map((p) => p.line)).toEqual([55, 65, 65]);
    expect(points.map((p) => p.bar)).toEqual([550, 60 * 8 + 65 * 5, 65 * 23]);
    expect(best).toMatchObject({ weightLb: 65, reps: 8 });
  });

  it('bodyweight: bars are total reps and line is the most reps in one set', () => {
    const history = [session(1, [{ reps: 10 }, { reps: 8 }, { isWarmup: true, reps: 20 }]), session(8, [{ reps: 6 }])];
    const { points } = buildProgressView(history, 'bodyweight', 'all', NOW);
    expect(points.map((p) => [p.line, p.bar])).toEqual([[6, 6], [10, 18]]);
  });

  it('timed: line is the longest hold and there are no bars', () => {
    const history = [session(1, [{ seconds: 30 }, { seconds: 45 }]), session(8, [{ seconds: 40 }])];
    const { points } = buildProgressView(history, 'timed', 'all', NOW);
    expect(points.map((p) => [p.line, p.bar])).toEqual([[40, null], [45, null]]);
  });

  it('ignores sessions whose sets do not fit the kind', () => {
    expect(buildProgressView([session(1, [{ seconds: 30 }])], 'weighted', 'all', NOW).points).toEqual([]);
  });

  it('ranges keep recent sessions only, but best so far looks at everything', () => {
    const history = [session(10, [{ weightLb: 50, reps: 5 }]), session(200, [{ weightLb: 90, reps: 5 }]), session(500, [{ weightLb: 40, reps: 5 }])];
    expect(buildProgressView(history, 'weighted', '3m', NOW)).toMatchObject({ sessions: [{ startedAt: NOW - 10 * DAY }], best: { weightLb: 90 } });
    expect(buildProgressView(history, 'weighted', '1y', NOW).sessions).toHaveLength(2);
    expect(buildProgressView(history, 'weighted', 'all', NOW).sessions).toHaveLength(3);
    expect(rangeStart('all', NOW)).toBeNull();
  });
});

describe('chart layout', () => {
  it('puts one point in the middle of the plot and handles equal values', () => {
    const layout = layoutChart([{ startedAt: 1, line: 50, bar: 100 }]);
    expect(layout.points).toHaveLength(1);
    expect(layout.points[0].x).toBeCloseTo(181);
    expect(layout.ticks.map((t) => t.label)).toEqual(['51', '50', '49']);
  });

  it('places higher values higher up, oldest point on the left', () => {
    const { points } = layoutChart([{ startedAt: 1, line: 40, bar: null }, { startedAt: 2, line: 60, bar: null }]);
    expect(points[0].x).toBeLessThan(points[1].x);
    expect(points[1].lineY).toBeLessThan(points[0].lineY);
    expect(points[0].barY).toBeNull();
  });
});
