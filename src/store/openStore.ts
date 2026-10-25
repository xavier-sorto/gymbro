import { GymBroDatabase, closeStore, setOpenDatabase } from './db';
import { StoreUnavailableError } from './errors';
import { requestPersistentStorageOnce } from './persistentStorage';
import { seedIfFirstLaunch } from './seed';

async function openDatabase(): Promise<GymBroDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new StoreUnavailableError({ cause: new Error('IndexedDB is not available in this browser context') });
  }
  const db = new GymBroDatabase();
  try {
    await db.open();
  } catch (error) {
    console.error('Opening the GymBro database failed', error);
    throw new StoreUnavailableError({ cause: error });
  }
  return db;
}

/** Opens the database, seeds on first launch and asks for persistent storage once. */
export async function openStore(): Promise<void> {
  closeStore();
  setOpenDatabase(await openDatabase());
  await seedIfFirstLaunch();
  await requestPersistentStorageOnce();
}
