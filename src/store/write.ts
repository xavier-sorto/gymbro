import type { Table } from 'dexie';
import { getDb } from './db';
import { StorageFullError } from './errors';
import type { DataTableName, DataTables, StoredRecord } from './types';

const TRANSIENT_RETRY_DELAY_MS = 200;
const MAX_ERROR_CHAIN = 5;

export type WritableTableName = DataTableName | 'meta';

export interface WriteContext {
  /** Stamps updatedAt, puts the record and adds its outbox row. Must run inside a writeTransaction. */
  save<T extends DataTableName>(table: T, record: DataTables[T]): Promise<DataTables[T]>;
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  for (let current = error; current && chain.length < MAX_ERROR_CHAIN; current = (current as { inner?: unknown }).inner) {
    chain.push(current);
  }
  return chain;
}

function hasErrorNamed(error: unknown, name: string): boolean {
  return errorChain(error).some((candidate) => (candidate as { name?: string }).name === name);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveWithOutbox<T extends DataTableName>(table: T, record: DataTables[T]): Promise<DataTables[T]> {
  const db = getDb();
  const stamped = { ...record, updatedAt: Date.now() };
  await (db.table(table) as Table<StoredRecord, string>).put(stamped);
  await db.outbox.add({ table, id: stamped.id, updatedAt: stamped.updatedAt });
  return stamped;
}

function runOnce<R>(tables: WritableTableName[], work: (context: WriteContext) => Promise<R>): Promise<R> {
  const db = getDb();
  const dexieTables = [...tables.map((name) => db.table(name)), db.outbox];
  return db.transaction('rw', dexieTables, () => work({ save: saveWithOutbox }));
}

function asStorageFull(error: unknown): StorageFullError | null {
  if (!hasErrorNamed(error, 'QuotaExceededError')) return null;
  console.error('Write failed: phone storage is full', error);
  return new StorageFullError({ cause: error });
}

/**
 * One read-write transaction over the tables and the outbox. Every record saved
 * through the context gets an outbox row; any failure rolls everything back.
 * A full phone throws StorageFullError; a transient abort is retried once.
 */
export async function writeTransaction<R>(
  tables: WritableTableName[],
  work: (context: WriteContext) => Promise<R>,
): Promise<R> {
  try {
    return await runOnce(tables, work);
  } catch (error) {
    const storageFull = asStorageFull(error);
    if (storageFull) throw storageFull;
    if (!hasErrorNamed(error, 'AbortError')) throw error;
    console.warn('Write aborted, retrying once', error);
    await sleep(TRANSIENT_RETRY_DELAY_MS);
    try {
      return await runOnce(tables, work);
    } catch (retryError) {
      console.error('Write failed again after retry', retryError);
      throw asStorageFull(retryError) ?? retryError;
    }
  }
}
