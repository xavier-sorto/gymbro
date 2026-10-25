import { GymBroDatabase, closeStore, setOpenDatabase } from './db';
import { DataNewerThanAppError, MigrationError, StoreUnavailableError } from './errors';
import { getMeta, setMeta } from './meta';
import { requestPersistentStorageOnce } from './persistentStorage';
import { SCHEMA_STEPS, latestVersion, type SchemaStep } from './schemaSteps';
import { seedIfFirstLaunch } from './seed';
import { prepareExistingDatabase } from './prepareExistingDatabase';

export interface OpenStoreOptions {
  /** Schema versions to use; only tests pass anything but the default. */
  schemaSteps?: SchemaStep[];
}

function openFailure(error: unknown, migratingFrom: number | null): Error {
  if ((error as { name?: string })?.name === 'VersionError') return new DataNewerThanAppError({ cause: error });
  if (migratingFrom !== null) return new MigrationError(migratingFrom, { cause: error });
  return new StoreUnavailableError({ cause: error });
}

async function openDatabase(steps: SchemaStep[]): Promise<GymBroDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new StoreUnavailableError({ cause: new Error('IndexedDB is not available in this browser context') });
  }
  const migratingFrom = await prepareExistingDatabase(steps);
  const db = new GymBroDatabase(steps);
  try {
    await db.open();
  } catch (error) {
    console.error('Opening the GymBro database failed', error);
    throw openFailure(error, migratingFrom);
  }
  return db;
}

async function recordSchemaVersion(version: number): Promise<void> {
  if ((await getMeta<number>('schemaVersion')) !== version) await setMeta('schemaVersion', version);
}

/** Opens the database (snapshotting first if an upgrade is due), seeds on first launch and asks for persistent storage once. */
export async function openStore(options: OpenStoreOptions = {}): Promise<void> {
  const steps = options.schemaSteps ?? SCHEMA_STEPS;
  closeStore();
  setOpenDatabase(await openDatabase(steps));
  await seedIfFirstLaunch();
  await recordSchemaVersion(latestVersion(steps));
  await requestPersistentStorageOnce();
}
