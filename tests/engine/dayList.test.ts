import { describe, expect, it } from 'vitest';
import { buildDayList } from '../../src/engine';
import { exercise } from './helpers';

const ids = (list: { exerciseId: string }[]) => list.map((e) => e.exerciseId);

describe('buildDayList', () => {
  it('Push template: 6 exercises in order, main lift flagged only on the bench', () => {
    const push = ['bench', 'ohp', 'incline', 'lateral', 'tri1', 'tri2'];
    const byId = Object.fromEntries(push.map((id) => [id, exercise({ id })]));
    const list = buildDayList({ exerciseIds: push, mainLiftIds: ['bench'] }, byId);
    expect(ids(list)).toEqual(push);
    expect(list.filter((e) => e.isMainLift).map((e) => e.exerciseId)).toEqual(['bench']);
  });

  it.each([
    ['merged exercise replaced by its target', ['a', 'b'], { b: exercise({ id: 'b', mergedInto: 'c' }), c: exercise({ id: 'c' }) }, ['a', 'c']],
    ['deleted exercise skipped', ['a', 'b'], { b: exercise({ id: 'b', deleted: true }) }, ['a']],
    ['repeat after a merge appears once', ['b', 'c'], { b: exercise({ id: 'b', mergedInto: 'c' }), c: exercise({ id: 'c' }) }, ['c']],
    ['merged into a deleted exercise is skipped', ['b'], { b: exercise({ id: 'b', mergedInto: 'c' }), c: exercise({ id: 'c', deleted: true }) }, []],
  ])('%s', (_name, exerciseIds, byId, expected) => {
    expect(ids(buildDayList({ exerciseIds, mainLiftIds: [] }, byId))).toEqual(expected);
  });

  it('flags a main lift that was merged into another exercise', () => {
    const byId = { b: exercise({ id: 'b', mergedInto: 'c' }), c: exercise({ id: 'c' }) };
    expect(buildDayList({ exerciseIds: ['b'], mainLiftIds: ['b'] }, byId)).toEqual([{ exerciseId: 'c', isMainLift: true }]);
    expect(buildDayList({ exerciseIds: ['b'], mainLiftIds: ['c'] }, byId)).toEqual([{ exerciseId: 'c', isMainLift: true }]);
  });
});
