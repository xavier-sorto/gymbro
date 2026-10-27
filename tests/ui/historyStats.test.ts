import { describe, expect, it } from 'vitest';
import { summarize, weekStart } from '../../src/ui/history/historyStats';

const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).getTime();
// Wed 28 Oct 2026; its week starts Mon 26 Oct.
const NOW = at(2026, 10, 28);
const workout = (startedAt: number, volumeLb = 1000) => ({ startedAt, volumeLb });

describe('weekStart', () => {
  it('is the Monday at midnight, including for a Sunday', () => {
    expect(weekStart(NOW)).toBe(new Date(2026, 9, 26).getTime());
    expect(weekStart(at(2026, 11, 1))).toBe(new Date(2026, 9, 26).getTime());
  });
});

describe('summarize', () => {
  it('is all zero with no workouts', () => {
    expect(summarize([], NOW)).toEqual({ weekWorkouts: 0, weekVolumeLb: 0, streakWeeks: 0 });
  });

  it('counts this week only and adds up its volume', () => {
    const stats = summarize([workout(at(2026, 10, 26), 500), workout(at(2026, 10, 28), 700), workout(at(2026, 10, 25), 9999)], NOW);
    expect(stats.weekWorkouts).toBe(2);
    expect(stats.weekVolumeLb).toBe(1200);
  });

  it('counts consecutive weeks and stops at the first gap', () => {
    const stats = summarize([workout(at(2026, 10, 27)), workout(at(2026, 10, 20)), workout(at(2026, 10, 13)), workout(at(2026, 9, 29))], NOW);
    expect(stats.streakWeeks).toBe(3);
  });

  it('keeps last week\'s streak alive before the first workout of this week', () => {
    expect(summarize([workout(at(2026, 10, 21)), workout(at(2026, 10, 14))], NOW).streakWeeks).toBe(2);
  });

  it('is zero when the last workout was before last week', () => {
    expect(summarize([workout(at(2026, 10, 7))], NOW).streakWeeks).toBe(0);
  });
});
