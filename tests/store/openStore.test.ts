import { describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { IDBFactory } from 'fake-indexeddb';
import { failPuts } from './helpers';
import { StoreUnavailableError, closeStore, listDayTypes, listExercises, openStore } from '../../src/store';
import { getDb } from '../../src/store/db';

describe('openStore', () => {
  it('throws StoreUnavailableError when indexedDB is undefined', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(openStore()).rejects.toBeInstanceOf(StoreUnavailableError);
  });

  it('seeds the five day types in order with their main lifts, and once only', async () => {
    await openStore();
    const days = await listDayTypes();
    expect(days.map((d) => d.name)).toEqual(['Push', 'Pull', 'Legs', 'Chest & Back', 'Shoulders & Arms']);
    const names = new Map((await listExercises()).map((e) => [e.id, e.name]));
    const mains = days.map((d) => d.mainLiftIds.map((id) => names.get(id)));
    expect(mains).toEqual([['Dumbbell Bench Press'], ['Barbell Row'], ['Back Squat'], ['Dumbbell Bench Press'], ['Overhead Press']]);
    expect(days[0]?.exerciseIds).toHaveLength(6);
    expect(days[1]?.exerciseIds).toHaveLength(7);
    const benches = (await listExercises()).filter((e) => e.name === 'Dumbbell Bench Press');
    expect(benches).toHaveLength(1);
    expect(benches[0]).toMatchObject({ setStyle: 'ramping', category: 'heavy', repMin: 6, repMax: 8, restSeconds: 90, seed: true });
    expect((await listExercises()).find((e) => e.name === 'Lateral Raise')).toMatchObject({ category: 'isolation', restSeconds: 60 });
    expect((await listExercises()).find((e) => e.name === 'Plank')?.kind).toBe('timed');
    expect((await listExercises()).find((e) => e.name === 'Dips')?.kind).toBe('bodyweight');

    const before = [await getDb().exercises.count(), await getDb().dayTypes.count(), await getDb().outbox.count()];
    await openStore();
    expect([await getDb().exercises.count(), await getDb().dayTypes.count(), await getDb().outbox.count()]).toEqual(before);
    expect(await getDb().meta.get('deviceId')).toBeTruthy();
  });

  it('rolls back an interrupted seed and seeds fully next time', async () => {
    const spy = failPuts('dayTypes', new Error('boom'));
    await expect(openStore()).rejects.toThrow('boom');
    closeStore();
    spy.mockRestore();
    await openStore();
    expect(await listExercises()).toHaveLength(23);
    expect(await getDb().meta.get('seededAt')).toBeTruthy();
  });

  it('records persistent storage once: granted, denied or unsupported', async () => {
    for (const [persist, expected] of [[true, 'granted'], [false, 'denied'], [undefined, 'unsupported']] as const) {
      Dexie.dependencies.indexedDB = new IDBFactory();
      const mock = vi.fn().mockResolvedValue(persist);
      vi.stubGlobal('navigator', { storage: persist === undefined ? undefined : { persist: mock } });
      await openStore();
      await openStore();
      expect((await getDb().meta.get('persistentStorage'))?.value).toBe(expected);
      expect(mock).toHaveBeenCalledTimes(persist === undefined ? 0 : 1);
      closeStore();
    }
  });
});
