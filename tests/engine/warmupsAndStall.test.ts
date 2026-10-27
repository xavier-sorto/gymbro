import { describe, expect, it } from 'vitest';
import { getGuide, warmupsFor } from '../../src/engine';
import { exercise, session, show, type SetSpec } from './helpers';

const lifts = (...sessions: [number, number][]) => sessions;
/** Newest first, one working set per session: weight x reps. */
const guideFor = (history: [number, number][], overrides = {}) =>
  getGuide(
    exercise(overrides),
    history.map(([weight, reps], index): ReturnType<typeof session> => session(1000 - index, [{ w: weight, r: reps } as SetSpec])),
    { isMainLift: false },
  );

describe('warmupsFor', () => {
  const settings = (warmupSets: number, extra = {}) => ({ kind: 'weighted' as const, warmupSets, weightStepLb: 5, ...extra });

  it.each([
    [0, []],
    [1, ['50x5']],
    [2, ['50x5', '75x3']],
    [3, ['40x5', '60x3', '80x2']],
  ])('%s warm-up sets before 100 lb', (count, expected) => {
    expect(show(warmupsFor(settings(count), 100))).toEqual(expected);
  });

  it('suggests nothing for bodyweight, timed, or an unknown working weight', () => {
    expect(warmupsFor({ ...settings(2), kind: 'bodyweight' }, 100)).toEqual([]);
    expect(warmupsFor({ ...settings(2), kind: 'timed' }, 100)).toEqual([]);
    expect(warmupsFor(settings(2), null)).toEqual([]);
    expect(warmupsFor(settings(2), 0)).toEqual([]);
  });

  it('rounds to the weight step and drops repeats and weights at or above the working weight', () => {
    expect(show(warmupsFor(settings(2, { weightStepLb: 25 }), 30))).toEqual(['25x5']);
    expect(warmupsFor(settings(1), 5)).toEqual([]);
  });
});

describe('stall detection', () => {
  it('flags three sessions in a row with no progress and suggests 90% at the top of the rep range', () => {
    const { stall } = guideFor(lifts([100, 6], [100, 6], [100, 6], [100, 6]));
    expect(stall?.stuckSessions).toBe(3);
    expect(show([stall!.reset])).toEqual(['90x8']);
    expect(stall!.reset.isWarmup).toBe(false);
  });

  it('is quiet with fewer than three stuck sessions', () => {
    expect(guideFor(lifts([100, 6], [100, 6], [100, 6])).stall).toBeNull();
  });

  it('is quiet when a session in the run made progress', () => {
    expect(guideFor(lifts([100, 6], [100, 6], [100, 6], [95, 8], [90, 8])).stall).toBeNull();
  });

  it('counts fewer reps at the same weight as no progress', () => {
    expect(guideFor(lifts([100, 5], [100, 6], [100, 6], [100, 6])).stall?.stuckSessions).toBe(3);
  });

  it('clears once the lighter weight is logged, then can stall again at that weight', () => {
    expect(guideFor(lifts([90, 8], [100, 6], [100, 6], [100, 6], [100, 6])).stall).toBeNull();
    const again = guideFor(lifts([90, 8], [90, 8], [90, 8], [90, 8], [100, 6]));
    expect(again.stall?.stuckSessions).toBe(3);
    expect(show([again.stall!.reset])).toEqual(['80x8']);
  });

  it('only applies to weighted lifts', () => {
    expect(guideFor(lifts([0, 10], [0, 10], [0, 10], [0, 10]), { kind: 'bodyweight' }).stall).toBeNull();
  });
});

describe('the guide', () => {
  it('builds warm-ups from today\'s target weight', () => {
    // last time 100 x 8 hit the top of the 6-8 range, so today's target is 105; half of that, 52.5, rounds to 55
    expect(show(guideFor(lifts([100, 8]), { warmupSets: 1 }).warmups)).toEqual(['55x5']);
  });
});
