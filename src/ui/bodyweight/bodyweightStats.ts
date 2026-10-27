import type { Bodyweight } from '../../store';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The change from the oldest weigh-in in the last 30 days to the newest, in pounds rounded to a tenth.
 * Null when there is no earlier weigh-in in that window to compare with. `entries` is newest first.
 */
export function changeOverThirtyDays(entries: readonly Bodyweight[], now: number): number | null {
  const [latest, ...earlier] = entries;
  if (!latest) return null;
  const inWindow = earlier.filter((entry) => entry.measuredAt >= now - THIRTY_DAYS_MS);
  const reference = inWindow[inWindow.length - 1];
  return reference ? Math.round((latest.weightLb - reference.weightLb) * 10) / 10 : null;
}
