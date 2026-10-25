import { getDb } from './db';
import type { BackupData } from './backupFormat';
import { DATA_TABLE_NAMES } from './types';

/** Every record (deleted ones included) of the five data tables, read in one consistent snapshot. */
export function readAllData(): Promise<BackupData> {
  const db = getDb();
  return db.transaction(
    'r',
    DATA_TABLE_NAMES.map((name) => db.table(name)),
    async () => {
      const entries = await Promise.all(DATA_TABLE_NAMES.map(async (name) => [name, await db.table(name).toArray()] as const));
      return Object.fromEntries(entries) as unknown as BackupData;
    },
  );
}
