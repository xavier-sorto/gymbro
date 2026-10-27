import { getDb } from '../../store/db';
import { getSettings } from '../settings/settings';
import { readLastFileExport } from './backupFileActions';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether to nudge the owner to back up. Never exported: once the oldest workout is `remindAfterDays` old.
 * Exported before: that long after the export, and only if there is a newer workout to lose. 0 days is off.
 */
export function backupIsDue(
  lastExportAt: number | null,
  oldestWorkoutAt: number | null,
  newestWorkoutAt: number | null,
  now: number,
  remindAfterDays = 30,
): boolean {
  if (remindAfterDays <= 0 || oldestWorkoutAt === null || newestWorkoutAt === null) return false;
  const limit = remindAfterDays * DAY_MS;
  if (lastExportAt === null) return now - oldestWorkoutAt > limit;
  return newestWorkoutAt > lastExportAt && now - lastExportAt > limit;
}

export async function loadBackupDue(now = Date.now()): Promise<boolean> {
  const finished = getDb().workouts.orderBy('startedAt').filter((workout) => !workout.deleted && workout.finishedAt !== null);
  const [oldest, newest] = await Promise.all([finished.first(), finished.reverse().first()]);
  return backupIsDue(await readLastFileExport(), oldest?.startedAt ?? null, newest?.startedAt ?? null, now, getSettings().backupReminderDays);
}
