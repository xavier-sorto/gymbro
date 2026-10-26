import { describe, expect, it } from 'vitest';
import { appendExercise, moveExercise, removeExercise, toggleMainLift } from '../../src/ui/dayTypes/templateEdits';

const lists = { exerciseIds: ['a', 'b', 'c'], mainLiftIds: ['b'] };

describe('template edits', () => {
  it('moves an exercise and ignores out-of-range moves', () => {
    expect(moveExercise(lists, 0, 1).exerciseIds).toEqual(['b', 'a', 'c']);
    expect(moveExercise(lists, 0, -1)).toBe(lists);
    expect(moveExercise(lists, 2, 1)).toBe(lists);
  });

  it('removing an exercise also drops its main-lift mark', () => {
    expect(removeExercise(lists, 'b')).toEqual({ exerciseIds: ['a', 'c'], mainLiftIds: [] });
  });

  it('appends once and toggles main lifts', () => {
    expect(appendExercise(lists, 'd').exerciseIds).toEqual(['a', 'b', 'c', 'd']);
    expect(appendExercise(lists, 'a')).toBe(lists);
    expect(toggleMainLift(lists, 'a').mainLiftIds).toEqual(['b', 'a']);
    expect(toggleMainLift(lists, 'b').mainLiftIds).toEqual([]);
  });
});
