import { setMeta, getMeta } from './meta';
import type { PersistentStorageStatus } from './types';

async function askBrowser(): Promise<PersistentStorageStatus> {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') {
    return 'unsupported';
  }
  try {
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch (error) {
    console.error('Asking the browser for persistent storage failed', error);
    return 'denied';
  }
}

/** Asks the browser to keep our data; the answer is stored in meta. */
export async function requestPersistentStorage(): Promise<PersistentStorageStatus> {
  const status = await askBrowser();
  await setMeta('persistentStorage', status);
  return status;
}

export async function requestPersistentStorageOnce(): Promise<void> {
  if ((await getMeta<PersistentStorageStatus>('persistentStorage')) === undefined) {
    await requestPersistentStorage();
  }
}
