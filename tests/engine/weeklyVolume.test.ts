import { describe, expect, it } from 'vitest';
import {
  MUSCLES,
  MUSCLE_TARGETS,
  SEED_MUSCLES,
  musclesOf,
  weeklyVolume,
  targetFor,
  zoneFor,
  type VolumeSet,
} from '../../src/engine';

const bench = { id: 'seed-ex-db-bench' };
const sets = (workoutId: string, exercise: VolumeSet['exercise'], count: number): VolumeSet[] =>
  Array.from({ length: count }, () => ({ workoutId, exercise }));

describe('musclesOf', () => {
  it('uses the starter table until the owner sets muscles', () => {
    expect(musclesOf(bench)).toEqual({ primary: 'chest', secondary: ['triceps', 'shoulders'] });
  });

  it('prefers what the owner stored, including choosing no muscle', () => {
    expect(musclesOf({ ...bench, primaryMuscle: 'back', secondaryMuscles: ['biceps'] })).toEqual({ primary: 'back', secondary: ['biceps'] });
    expect(musclesOf({ ...bench, primaryMuscle: null })).toEqual({ primary: null, secondary: [] });
  });

  it('has no muscles for an unknown exercise', () => {
    expect(musclesOf({ id: 'made-by-owner' })).toEqual({ primary: null, secondary: [] });
  });

  it('maps every starter exercise to real muscles with no repeats', () => {
    for (const [id, { primary, secondary = [] }] of Object.entries(SEED_MUSCLES)) {
      expect(MUSCLES, id).toContain(primary);
      expect(secondary.every((muscle) => MUSCLES.includes(muscle)), id).toBe(true);
      expect(secondary, id).not.toContain(primary);
      expect(new Set(secondary).size, id).toBe(secondary.length);
    }
  });
});

describe('weeklyVolume', () => {
  it('counts a set fully for its main muscle and half for the others', () => {
    const { byMuscle } = weeklyVolume(sets('w1', bench, 4));
    expect(byMuscle.chest.sets).toBe(4);
    expect(byMuscle.triceps.sets).toBe(2);
    expect(byMuscle.shoulders.sets).toBe(2);
    expect(byMuscle.back.sets).toBe(0);
  });

  it('adds up across workouts and counts a training day only at two or more sets', () => {
    const rows = [...sets('w1', bench, 3), ...sets('w2', bench, 2), ...sets('w3', { id: 'seed-ex-cable-fly' }, 1)];
    const { byMuscle } = weeklyVolume(rows);
    expect(byMuscle.chest).toEqual({ sets: 6, days: 2 });
    // triceps got 1.5 and 1 from the benches: never two in one workout
    expect(byMuscle.triceps).toEqual({ sets: 2.5, days: 0 });
  });

  it('reports sets with no muscle instead of dropping them', () => {
    const rows = [...sets('w1', { id: 'made-by-owner' }, 2), ...sets('w1', null, 1), ...sets('w1', { ...bench, primaryMuscle: null }, 1)];
    expect(weeklyVolume(rows).unassignedSets).toBe(4);
    expect(weeklyVolume(rows).byMuscle.chest.sets).toBe(0);
  });

  it('never double counts a muscle listed as both main and secondary', () => {
    const odd = { id: 'x', primaryMuscle: 'chest' as const, secondaryMuscles: ['chest' as const, 'triceps' as const] };
    const { byMuscle } = weeklyVolume(sets('w1', odd, 2));
    expect(byMuscle.chest.sets).toBe(2);
    expect(byMuscle.triceps.sets).toBe(1);
  });

  it('is all zero for no sets', () => {
    const { byMuscle, unassignedSets } = weeklyVolume([]);
    expect(unassignedSets).toBe(0);
    expect(MUSCLES.every((muscle) => byMuscle[muscle].sets === 0 && byMuscle[muscle].days === 0)).toBe(true);
  });
});

describe('weekly targets', () => {
  it('are in order and cover every muscle', () => {
    for (const muscle of MUSCLES) {
      const { min, low, high } = MUSCLE_TARGETS[muscle];
      expect(min, muscle).toBeLessThanOrEqual(low);
      expect(low, muscle).toBeLessThan(high);
    }
  });

  it('put the ten-set evidence threshold inside the target range for the big muscles', () => {
    for (const muscle of ['chest', 'back', 'quads', 'biceps', 'shoulders'] as const) {
      const { low, high } = MUSCLE_TARGETS[muscle];
      expect(low, muscle).toBeLessThanOrEqual(14);
      expect(high, muscle).toBeGreaterThanOrEqual(16);
    }
  });

  it('scales the ranges for lighter and higher weeks, in whole sets', () => {
    expect(targetFor('chest')).toEqual({ min: 8, low: 12, high: 20 });
    expect(targetFor('chest', 'higher')).toEqual({ min: 10, low: 15, high: 25 });
    expect(targetFor('chest', 'lighter')).toEqual({ min: 6, low: 9, high: 15 });
    expect(zoneFor('chest', 12, 'higher')).toBe('building');
    expect(zoneFor('chest', 12, 'lighter')).toBe('target');
    expect(zoneFor('chest', 16, 'lighter')).toBe('above');
  });

  it('sorts a count into below, building, target and above', () => {
    expect(zoneFor('chest', 0)).toBe('below');
    expect(zoneFor('chest', 7.5)).toBe('below');
    expect(zoneFor('chest', 8)).toBe('building');
    expect(zoneFor('chest', 11.5)).toBe('building');
    expect(zoneFor('chest', 12)).toBe('target');
    expect(zoneFor('chest', 20)).toBe('target');
    expect(zoneFor('chest', 20.5)).toBe('above');
    expect(zoneFor('forearms', 0)).toBe('below');
    expect(zoneFor('forearms', 2)).toBe('building');
  });
});
