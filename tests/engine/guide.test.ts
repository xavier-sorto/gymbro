import { describe, expect, it } from 'vitest';
import { effectiveSettings, getGuide } from '../../src/engine';
import type { Exercise } from '../../src/store/types';
import { exercise, session, show, type SetSpec } from './helpers';

const guideFor = (settings: Partial<Exercise>, sessions: SetSpec[][]) =>
  getGuide(
    exercise(settings),
    sessions.map((sets, i) => session(100 - i, sets)),
    { isMainLift: true },
  );

const w = (weight: number, ...reps: number[]): SetSpec[] => reps.map((r) => ({ w: weight, r }));

describe('target: straight weighted', () => {
  it.each([
    ['all sets at the top', [w(135, 8, 8, 8)], ['140x6', '140x6', '140x6'], 'Add 5 lb'],
    ['only the first short set gets +1', [w(135, 8, 7, 6)], ['135x8', '135x8', '135x6'], 'One more rep'],
    ['ignores lighter working sets', [[{ w: 115, r: 10 }, ...w(135, 8, 8)]], ['140x6', '140x6'], 'Add 5 lb'],
    ['warm-ups never count', [[{ w: 60, r: 5, warm: true }, { w: 90, r: 3, warm: true }, ...w(135, 8, 7, 6)]], ['135x8', '135x8', '135x6'], 'One more rep'],
    ['uses only the newest session', [w(135, 8, 7), w(100, 8, 8)], ['135x8', '135x8'], 'One more rep'],
  ])('%s', (_name, sessions, expected, note) => {
    const { target } = guideFor({}, sessions);
    expect(show(target?.sets ?? [])).toEqual(expected);
    expect(target?.note).toBe(note);
  });

  it('uses the exercise step in the note and the weight', () => {
    const { target } = guideFor({ weightStepLb: 2.5 }, [w(100, 8, 8)]);
    expect(show(target?.sets ?? [])).toEqual(['102.5x6', '102.5x6']);
    expect(target?.note).toBe('Add 2.5 lb');
  });

  it('gives the same target with and without warm-ups in history', () => {
    const plain = guideFor({}, [w(135, 8, 7, 6)]).target;
    const withWarmups = guideFor({}, [[{ w: 45, r: 8, warm: true }, { w: 95, r: 5, warm: true }, ...w(135, 8, 7, 6)]]).target;
    expect(withWarmups).toEqual(plain);
  });
});

describe('target: ramping', () => {
  it.each([
    ['top hit', [[50, 55, 60, 65].map((x) => ({ w: x, r: 8 }))], ['55x8', '60x8', '65x8', '70x6'], 'Top set +5 lb'],
    [
      'top short; climb reps do not matter',
      [[{ w: 50, r: 8 }, { w: 55, r: 8 }, { w: 60, r: 7 }, { w: 65, r: 6 }]],
      ['50x8', '55x8', '60x7', '65x7'],
      'One more rep on top set',
    ],
    ['no climb sets', [[{ w: 65, r: 8 }]], ['70x6'], 'Top set +5 lb'],
  ])('%s', (_name, sessions, expected, note) => {
    const { target } = guideFor({ setStyle: 'ramping' }, sessions);
    expect(show(target?.sets ?? [])).toEqual(expected);
    expect(target?.note).toBe(note);
  });

  it('labels roles climb then top', () => {
    const { target } = guideFor({ setStyle: 'ramping' }, [[{ w: 50, r: 8 }, { w: 65, r: 6 }]]);
    expect(target?.sets.map((s) => s.role)).toEqual(['climb', 'top']);
  });
});

describe('target: bodyweight and timed', () => {
  it.each([
    ['bodyweight', 'bodyweight', [[{ r: 10 }, { r: 9 }, { r: 8 }]], ['10', '9', '9'], 'One more rep'],
    ['bodyweight first fewest on ties', 'bodyweight', [[{ r: 9 }, { r: 8 }, { r: 8 }]], ['9', '9', '8'], 'One more rep'],
    ['bodyweight all at repMax', 'bodyweight', [[{ r: 12 }, { r: 12 }]], ['13', '12'], 'One more rep. Ready for a harder version'],
    ['timed', 'timed', [[{ s: 60 }, { s: 45 }]], ['60s', '50s'], '+5 seconds'],
  ] as const)('%s', (_name, kind, sessions, expected, note) => {
    const { target } = guideFor({ kind, repMin: 8, repMax: 12 }, sessions.map((s) => [...s]));
    expect(show(target?.sets ?? [])).toEqual(expected);
    expect(target?.note).toBe(note);
  });
});

describe('last, best and first time', () => {
  it('last is the newest counting session', () => {
    const guide = guideFor({}, [[{ w: 60, r: 5, warm: true }], w(100, 8), w(90, 8)]);
    expect(guide.last).toMatchObject({ startedAt: 99, workingSets: [{ weightLb: 100, reps: 8 }] });
    expect(guide.firstTime).toBe(false);
  });

  it.each([
    ['weighted: heaviest', 'weighted', [w(100, 8), [{ w: 110, r: 5 }], w(105, 12)], { weightLb: 110, reps: 5, startedAt: 99 }],
    ['weighted: tie goes to more reps', 'weighted', [w(100, 6), w(100, 8), w(100, 7)], { weightLb: 100, reps: 8, startedAt: 99 }],
    ['weighted: full tie goes to the newer session', 'weighted', [w(100, 8), w(100, 8)], { weightLb: 100, reps: 8, startedAt: 100 }],
    ['bodyweight: most reps', 'bodyweight', [[{ r: 10 }, { r: 12 }], [{ r: 11 }]], { reps: 12, startedAt: 100 }],
    ['timed: longest hold', 'timed', [[{ s: 30 }], [{ s: 50 }, { s: 40 }]], { seconds: 50, startedAt: 99 }],
  ] as const)('best so far %s', (_name, kind, sessions, expected) => {
    expect(guideFor({ kind, repMin: 8, repMax: 12 }, sessions.map((s) => [...s])).best).toEqual(expected);
  });

  it('first time: empty history gives firstTime, no target, best, last or warm-ups', () => {
    expect(guideFor({}, [])).toEqual({ firstTime: true, last: null, best: null, target: null, warmups: [], stall: null });
  });

  it('a session with only warm-ups does not count', () => {
    expect(guideFor({}, [[{ w: 50, r: 5, warm: true }]]).firstTime).toBe(true);
  });

  it('kind mismatch: weighted history on a bodyweight exercise uses only sets with reps and no weight', () => {
    const guide = guideFor({ kind: 'bodyweight' }, [[{ w: 100, r: 8 }, { r: 10 }], [{ w: 100, r: 8 }]]);
    expect(show(guide.last?.workingSets ?? [])).toEqual(['10']);
    expect(guideFor({ kind: 'bodyweight' }, [w(100, 8)]).firstTime).toBe(true);
  });

  it('never throws on damaged data', () => {
    const damaged = [[{ r: Number.NaN, w: 100 }, { w: 100 }, {}]];
    expect(guideFor({}, damaged).firstTime).toBe(true);
  });
});

describe('bad settings fall back to defaults', () => {
  it('repMin above repMax behaves as the category range (heavy 6-8)', () => {
    const { target } = guideFor({ repMin: 10, repMax: 6 }, [w(135, 8, 8)]);
    expect(show(target?.sets ?? [])).toEqual(['140x6', '140x6']);
  });

  it.each([
    ['missing reps, compound', { category: 'compound', repMin: undefined, repMax: undefined }, 8, 10],
    ['isolation', { category: 'isolation', repMin: 0, repMax: 0 }, 10, 15],
  ] as const)('%s', (_name, settings, repMin, repMax) => {
    expect(effectiveSettings(settings)).toMatchObject({ repMin, repMax });
  });

  it.each([[0], [-5], [Number.NaN]])('weightStepLb %s behaves as 5', (step) => {
    const { target } = guideFor({ weightStepLb: step }, [w(135, 8, 8)]);
    expect(show(target?.sets ?? [])).toEqual(['140x6', '140x6']);
  });

  it.each([[7, 3], [-1, 0], [2, 2], [Number.NaN, 0]])('warmupSets %s clamps to %s', (input, expected) => {
    expect(effectiveSettings({ warmupSets: input }).warmupSets).toBe(expected);
  });
});

describe('stubs for later milestones', () => {
  it('guide has no warm-ups and no stall yet', () => {
    const guide = guideFor({ warmupSets: 2 }, [w(135, 8, 8, 8)]);
    expect(guide.warmups).toEqual([]);
    expect(guide.stall).toBeNull();
  });
});
