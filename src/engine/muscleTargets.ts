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

export const TARGET_SCALES = ['lighter', 'standard', 'higher'] as const;
export type TargetScale = (typeof TARGET_SCALES)[number];

const SCALE_FACTORS: Record<TargetScale, number> = { lighter: 0.75, standard: 1, higher: 1.25 };

/** The ranges above scaled for someone who wants less or more volume, in whole sets. */
export function targetFor(muscle: Muscle, scale: TargetScale = 'standard'): MuscleTarget {
  const { min, low, high } = MUSCLE_TARGETS[muscle];
  const factor = SCALE_FACTORS[scale];
  return { min: Math.round(min * factor), low: Math.round(low * factor), high: Math.round(high * factor) };
}

export type VolumeZone = 'below' | 'building' | 'target' | 'above';

/** Where a week's set count falls: under the minimum, building toward the range, in it, or past it. */
export function zoneFor(muscle: Muscle, sets: number, scale: TargetScale = 'standard'): VolumeZone {
  const { min, low, high } = targetFor(muscle, scale);
  if (sets > high) return 'above';
  if (sets >= low) return 'target';
  return sets >= min && sets > 0 ? 'building' : 'below';
}
