import type { BackupData } from './backupFormat';
import { SCHEMA_VERSION } from './types';

/** Upgrade functions for parsed backups, keyed by the version they upgrade from. Additive-only changes to existing tables need none; a new table needs an empty default. */
const BACKUP_UPGRADES: Record<number, (data: BackupData) => BackupData> = {
  // Version 2 added weigh-ins; a version 1 backup has none.
  1: (data) => ({ ...data, bodyweights: data.bodyweights ?? [] }),
};

/** Brings backup data written at an older schema version up to the current one, in memory. */
export function upgradeBackupData(data: BackupData, fromVersion: number): BackupData {
  let upgraded = data;
  for (let version = fromVersion; version < SCHEMA_VERSION; version++) {
    upgraded = BACKUP_UPGRADES[version]?.(upgraded) ?? upgraded;
  }
  return upgraded;
}
