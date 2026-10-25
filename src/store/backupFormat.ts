import type { DataTableName, DataTables } from './types';

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export type BackupData = { [T in DataTableName]: DataTables[T][] };

export interface BackupFile {
  app: 'gymbro';
  schemaVersion: number;
  exportedAt: number;
  data: BackupData;
}
