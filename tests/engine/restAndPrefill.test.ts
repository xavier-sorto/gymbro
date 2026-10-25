import { describe, expect, it } from 'vitest';
import { getGuide, prefillNext, restAfter, type Guide, type PlannedSet } from '../../src/engine';
import { exercise, session, show } from './helpers';

describe('restAfter', () => {
  it.each([
    ['warm-up', { isWarmup: true }, { restSeconds: 120 }, 60],
    ['working set', { isWarmup: false }, { restSeconds: 120 }, 120],
    ['missing restSeconds', { isWarmup: false }, { restSeconds: undefined }, 90],
    ['invalid restSeconds', { isWarmup: false }, { restSeconds: -5 }, 90],
  ])('%s', (_name, savedSet, settings, seconds) => {
    expect(restAfter(settings, savedSet)).toBe(seconds);
  });
});

const planned = (weightLb: number, reps: number, isWarmup = false): PlannedSet => ({
  weightLb,
  reps,
  seconds: null,
  isWarmup,
  role: isWarmup ? 'warmup' : 'working',
});
const entered = (weightLb: number, reps: number, isWarmup = false) => ({ weightLb, reps, seconds: null, isWarmup });

describe('prefillNext', () => {
  const guide: Guide = {
    firstTime: false,
    last: null,
    best: null,
    target: { sets: [planned(100, 8), planned(100, 8), planned(100, 8)], note: '' },
    warmups: [planned(50, 5, true), planned(75, 3, true)],
    stall: null,
  };

  it('goes warm-up 1, warm-up 2, target 1-3, then copies the last working set entered', () => {
    const done = [
      entered(50, 5, true),
      entered(75, 3, true),
      entered(100, 8),
      entered(100, 8),
      entered(100, 8),
      entered(105, 6),
    ];
    const results = Array.from({ length: 7 }, (_v, n) => prefillNext(guide, done.slice(0, Math.min(n, 5)))).map(
      (p) => p && `${p.weightLb}x${p.reps}${p.isWarmup ? 'w' : ''}`,
    );
    expect(results).toEqual(['50x5w', '75x3w', '100x8', '100x8', '100x8', '100x8', '100x8']);
    expect(prefillNext(guide, done)).toMatchObject({ weightLb: 105, reps: 6, role: 'working', isWarmup: false });
  });

  it('uses the target when there is one, and the last set entered when there is none', () => {
    const history = [session(1, [{ w: 100, r: 6 }, { w: 100, r: 6 }])];
    const withTarget = getGuide(exercise(), history, { isMainLift: false });
    expect(prefillNext(withTarget, [])).toMatchObject({ weightLb: 100, reps: 7 });
    const noTarget = getGuide(exercise(), [], { isMainLift: false });
    expect(prefillNext(noTarget, [entered(60, 10)])).toMatchObject({ weightLb: 60, reps: 10 });
    expect(show([prefillNext(noTarget, [entered(60, 10)]) as PlannedSet])).toEqual(['60x10']);
  });

  it('first time with nothing entered gives null', () => {
    expect(prefillNext(getGuide(exercise(), [], { isMainLift: true }), [])).toBeNull();
    expect(prefillNext(getGuide(exercise(), [], { isMainLift: true }), [entered(50, 5, true)])).toBeNull();
  });
});
