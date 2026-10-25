import Dexie from 'dexie';
import { DATABASE_NAME } from './db';
import { DataNewerThanAppError, MigrationError, StoreUnavailableError } from './errors';
import { latestVersion, type SchemaStep } from './schemaSteps';
import { saveSnapshot, type Snapshot } from './snapshots';

/** Dexie 4 quietly opens newer data with an older schema, so the version is compared here. */
async function readIfUpgradeDue(steps: SchemaStep[]): Promise<Snapshot | null> {
  if (!(await Dexie.exists(DATABASE_NAME))) return null;
  const existing = new Dexie(DATABASE_NAME);
  try {
    await existing.open();
    const schemaVersion = Math.round(existing.verno);
    if (schemaVersion > latestVersion(steps)) {
      throw new DataNewerThanAppError({ cause: new Error(`Stored data is version ${schemaVersion}`) });
    }
    if (schemaVersion === latestVersion(steps)) return null;
    const entries = await Promise.all(existing.tables.map(async (table) => [table.name, await table.toArray()] as const));
    return { schemaVersion, takenAt: Date.now(), tables: Object.fromEntries(entries) };
  } catch (error) {
    if (error instanceof DataNewerThanAppError) throw error;
    console.error('Reading the existing GymBro database failed', error);
    throw new StoreUnavailableError({ cause: error });
  } finally {
    existing.close();
  }
}

/**
 * Looks at the stored database before it is opened with the app's schema.
 * Newer data than the app knows throws DataNewerThanAppError. If an upgrade is due,
 * saves a snapshot first and returns the version being migrated from (null when no upgrade is due).
 * A failed snapshot stops the upgrade (MigrationError) so no data is changed without a copy.
 */
export async function prepareExistingDatabase(steps: SchemaStep[]): Promise<number | null> {
  const snapshot = await readIfUpgradeDue(steps);
  if (!snapshot) return null;
  try {
    await saveSnapshot(snapshot);
  } catch (error) {
    console.error(`Saving the safety snapshot of version ${snapshot.schemaVersion} failed`, error);
    throw new MigrationError(snapshot.schemaVersion, { cause: error });
  }
  return snapshot.schemaVersion;
}
