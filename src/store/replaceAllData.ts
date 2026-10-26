import { getDb } from './db';
import type { BackupData } from './backupFormat';
import { DATA_TABLE_NAMES } from './types';
import { writeTransaction } from './write';

/**
 * Replaces the five data tables and the outbox with the given records in one
 * all-or-nothing transaction. Records keep their own updatedAt; every record gets an outbox row.
 */
export function replaceAllData(data: BackupData): Promise<void> {
  return writeTransaction([...DATA_TABLE_NAMES], async () => {
    const db = getDb();
    await db.outbox.clear();
    for (const name of DATA_TABLE_NAMES) {
      const records = data[name];
      await db.table(name).clear();
      await db.table(name).bulkPut(records);
      await db.outbox.bulkAdd(records.map((record) => ({ table: name, id: record.id, updatedAt: record.updatedAt })));
    }
  });
}
