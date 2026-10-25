import Dexie from 'dexie';
import { DATABASE_NAME, GymBroDatabase, closeStore } from './db';
import { MigrationError } from './errors';
import { openStore } from './openStore';
import { SCHEMA_STEPS, latestVersion, type SchemaStep } from './schemaSteps';
import { readSnapshot } from './snapshots';

/**
 * For an older app that found newer data (DataNewerThanAppError): deletes "gymbro",
 * rebuilds it from the snapshot taken before the update for this app's own version,
 * and opens it. Data logged after the update is lost locally.
 */
export async function restoreFromSnapshot(steps: SchemaStep[] = SCHEMA_STEPS): Promise<void> {
  const version = latestVersion(steps);
  const snapshot = await readSnapshot(version);
  if (!snapshot) {
    throw new MigrationError(version, { cause: new Error(`No safety snapshot exists for version ${version}`) });
  }
  closeStore();
  await Dexie.delete(DATABASE_NAME);
  const db = new GymBroDatabase(steps);
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.bulkPut(snapshot.tables[table.name] ?? []);
    });
  } finally {
    db.close();
  }
  await openStore({ schemaSteps: steps });
}
