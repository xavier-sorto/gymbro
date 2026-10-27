import type { Muscle } from '../store/types';

/**
 * Weekly working sets per muscle. These are guideline estimates, not exact science:
 * - `low` is where a muscle is well fed. The 2017 Schoenfeld, Ogborn and Krieger meta-analysis found
 *   10 or more weekly sets per muscle grew more muscle than fewer, so most muscles start at 10 or more.
 *   Muscles that other lifts already hit hard (shoulders, triceps, glutes, hamstrings) start lower.
 * - `min` is roughly the least that still makes progress; below it a muscle is mostly maintained.
 * - `high` is where extra sets stop paying off for most people and recovery gets harder.
 * The numbers follow commonly used training-volume landmarks. They vary by person, so edit them here.
 */
export interface MuscleTarget {
  min: number;
  low: number;
  high: number;
}

export const MUSCLE_TARGETS: Record<Muscle, MuscleTarget> = {
  chest: { min: 8, low: 12, high: 20 },
  back: { min: 8, low: 14, high: 22 },
  shoulders: { min: 6, low: 12, high: 20 },
  rearDelts: { min: 4, low: 8, high: 16 },
  biceps: { min: 6, low: 12, high: 20 },
  triceps: { min: 6, low: 10, high: 16 },
  forearms: { min: 0, low: 4, high: 12 },
  quads: { min: 6, low: 10, high: 16 },
  hamstrings: { min: 4, low: 8, high: 14 },
  glutes: { min: 4, low: 8, high: 16 },
  calves: { min: 6, low: 10, high: 16 },
  abs: { min: 4, low: 10, high: 20 },
};

export type VolumeZone = 'below' | 'building' | 'target' | 'above';

/** Where a week's set count falls: under the minimum, building toward the range, in it, or past it. */
export function zoneFor(muscle: Muscle, sets: number): VolumeZone {
  const { min, low, high } = MUSCLE_TARGETS[muscle];
  if (sets > high) return 'above';
  if (sets >= low) return 'target';
  return sets >= min && sets > 0 ? 'building' : 'below';
}
