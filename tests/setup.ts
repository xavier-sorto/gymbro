import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { closeStore } from '../src/store';

beforeEach(() => {
  Dexie.dependencies.indexedDB = new IDBFactory();
  globalThis.indexedDB = Dexie.dependencies.indexedDB;
});

afterEach(() => {
  closeStore();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
