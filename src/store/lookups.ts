import { getDb } from './db';
import { NotFoundError } from './errors';
import type { DataTableName, DataTables } from './types';

/** Returns the non-deleted record or throws NotFoundError. */
export async function requireRecord<T extends DataTableName>(table: T, id: string): Promise<DataTables[T]> {
  const record = (await getDb().table(table).get(id)) as DataTables[T] | undefined;
  if (!record || record.deleted) throw new NotFoundError(table, id);
  return record;
}
