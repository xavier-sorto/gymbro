import { getDb } from '../../store/db';
import { readLastFileExport } from './backupFileActions';

const REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Whether to nudge the owner to back up. Never exported: once the oldest workout is a month old.
 * Exported before: a month after that, and only if there is a newer workout to lose.
 */
export function backupIsDue(
  lastExportAt: number | null,
  oldestWorkoutAt: number | null,
  newestWorkoutAt: number | null,
  now: number,
): boolean {
  if (oldestWorkoutAt === null || newestWorkoutAt === null) return false;
  if (lastExportAt === null) return now - oldestWorkoutAt > REMIND_AFTER_MS;
  return newestWorkoutAt > lastExportAt && now - lastExportAt > REMIND_AFTER_MS;
}

export async function loadBackupDue(now = Date.now()): Promise<boolean> {
  const finished = getDb().workouts.orderBy('startedAt').filter((workout) => !workout.deleted && workout.finishedAt !== null);
  const [oldest, newest] = await Promise.all([finished.first(), finished.reverse().first()]);
  return backupIsDue(await readLastFileExport(), oldest?.startedAt ?? null, newest?.startedAt ?? null, now);
}
