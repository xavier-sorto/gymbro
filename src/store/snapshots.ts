import Dexie, { type Table } from 'dexie';

export const SNAPSHOT_DATABASE_NAME = 'gymbro-snapshots';
const SNAPSHOTS_KEPT = 2;

/** A full copy of every table of "gymbro" as it was at schemaVersion. */
export interface Snapshot {
  schemaVersion: number;
  takenAt: number;
  tables: Record<string, unknown[]>;
}

/** Its own database (version 1, never changed) so an older app can still open it after a failed update. */
class SnapshotDatabase extends Dexie {
  snapshots!: Table<Snapshot, number>;

  constructor() {
    super(SNAPSHOT_DATABASE_NAME);
    this.version(1).stores({ snapshots: 'schemaVersion' });
  }
}

async function withSnapshotDatabase<T>(work: (db: SnapshotDatabase) => Promise<T>): Promise<T> {
  const db = new SnapshotDatabase();
  try {
    return await work(db);
  } finally {
    db.close();
  }
}

/** Stores the snapshot under its schema version and keeps only the newest two. */
export function saveSnapshot(snapshot: Snapshot): Promise<void> {
  return withSnapshotDatabase((db) =>
    db.transaction('rw', db.snapshots, async () => {
      await db.snapshots.put(snapshot);
      const versions = (await db.snapshots.orderBy('schemaVersion').primaryKeys()).sort((a, b) => b - a);
      await db.snapshots.bulkDelete(versions.slice(SNAPSHOTS_KEPT));
    }),
  );
}

export function readSnapshot(schemaVersion: number): Promise<Snapshot | undefined> {
  return withSnapshotDatabase((db) => db.snapshots.get(schemaVersion));
}
