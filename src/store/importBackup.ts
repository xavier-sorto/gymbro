import { MAX_BACKUP_BYTES, type BackupData } from './backupFormat';
import { upgradeBackupData } from './backupUpgrade';
import { validateBackupData } from './backupRecords';
import { ImportError } from './errors';
import { replaceAllData } from './replaceAllData';
import { SCHEMA_VERSION } from './types';

async function parseBackup(file: Blob): Promise<{ schemaVersion: number; data: unknown }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch (error) {
    throw new ImportError('not-gymbro', undefined, undefined, { cause: error });
  }
  const candidate = parsed as { app?: unknown; schemaVersion?: unknown; data?: unknown } | null;
  if (candidate?.app !== 'gymbro' || !Number.isInteger(candidate.schemaVersion) || (candidate.schemaVersion as number) < 1) {
    throw new ImportError('not-gymbro');
  }
  return { schemaVersion: candidate.schemaVersion as number, data: candidate.data };
}

/**
 * Replaces all local data with a backup file. Everything is checked before anything is
 * written, so any ImportError leaves the database unchanged.
 */
export async function importBackup(file: Blob): Promise<void> {
  if (file.size > MAX_BACKUP_BYTES) throw new ImportError('too-large');
  const { schemaVersion, data } = await parseBackup(file);
  if (schemaVersion > SCHEMA_VERSION) throw new ImportError('newer-version');
  const upgraded: BackupData = upgradeBackupData(data as BackupData, schemaVersion);
  await replaceAllData(validateBackupData(upgraded));
}
