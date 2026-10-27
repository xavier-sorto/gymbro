import { describe, expect, it } from 'vitest';
import { beatsBest, compareBest, estimatedOneRepMax } from '../../src/engine/best';
import { toPlannedSet } from '../../src/engine/workingSets';

const set = (weightLb: number | null, reps: number | null, seconds: number | null = null) =>
  toPlannedSet({ isWarmup: false, weightLb, reps, seconds });

describe('beatsBest', () => {
  const best = { weightLb: 100, reps: 5, startedAt: 1 };

  it('is true for a heavier set and for the same weight with more reps', () => {
    expect(beatsBest('weighted', set(105, 3), best, [])).toBe(true);
    expect(beatsBest('weighted', set(100, 6), best, [])).toBe(true);
  });

  it('is false for a tie or a lighter set', () => {
    expect(beatsBest('weighted', set(100, 5), best, [])).toBe(false);
    expect(beatsBest('weighted', set(95, 12), best, [])).toBe(false);
  });

  it('must also beat the earlier working sets of the same workout', () => {
    expect(beatsBest('weighted', set(105, 3), best, [set(110, 2)])).toBe(false);
    expect(beatsBest('weighted', set(115, 2), best, [set(110, 2)])).toBe(true);
  });

  it('is never true when there is no past best, so the first ever set is not a record', () => {
    expect(beatsBest('weighted', set(100, 5), null, [])).toBe(false);
  });

  it('works for bodyweight reps and timed holds', () => {
    expect(beatsBest('bodyweight', set(null, 11), { reps: 10, startedAt: 1 }, [])).toBe(true);
    expect(beatsBest('timed', set(null, null, 45), { seconds: 60, startedAt: 1 }, [])).toBe(false);
  });
});

describe('estimatedOneRepMax', () => {
  it('uses the Epley formula, rounded to a whole pound', () => {
    expect(estimatedOneRepMax(100, 5)).toBe(117);
    expect(estimatedOneRepMax(225, 1)).toBe(225);
  });
});

describe('compareBest', () => {
  const before = { weightLb: 100, reps: 5, startedAt: 1 };

  it('reports the weight change first, then the rep change at the same weight', () => {
    expect(compareBest('weighted', { weightLb: 105, reps: 3, startedAt: 2 }, before)).toEqual({ value: 5, unit: 'lb' });
    expect(compareBest('weighted', { weightLb: 95, reps: 9, startedAt: 2 }, before)).toEqual({ value: -5, unit: 'lb' });
    expect(compareBest('weighted', { weightLb: 100, reps: 7, startedAt: 2 }, before)).toEqual({ value: 2, unit: 'rep' });
    expect(compareBest('weighted', { weightLb: 100, reps: 5, startedAt: 2 }, before).value).toBe(0);
  });

  it('uses reps for bodyweight and seconds for timed', () => {
    expect(compareBest('bodyweight', { reps: 12, startedAt: 2 }, { reps: 10, startedAt: 1 })).toEqual({ value: 2, unit: 'rep' });
    expect(compareBest('timed', { seconds: 50, startedAt: 2 }, { seconds: 60, startedAt: 1 })).toEqual({ value: -10, unit: 's' });
  });
});
