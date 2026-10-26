import type { BackupFile } from './backupFormat';
import { localDate } from './localTime';
import { readAllData } from './readAllData';
import { setMeta } from './meta';
import { SCHEMA_VERSION } from './types';

/** The whole local data (deleted records included) as a downloadable JSON file; notes the export time in meta. */
export async function exportBackup(): Promise<File> {
  const exportedAt = Date.now();
  const backup: BackupFile = { app: 'gymbro', schemaVersion: SCHEMA_VERSION, exportedAt, data: await readAllData() };
  await setMeta('lastFileExportAt', exportedAt);
  return new File([JSON.stringify(backup)], `gymbro-backup-${localDate(exportedAt)}.json`, { type: 'application/json' });
}
