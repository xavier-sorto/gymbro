import { describe, expect, it, vi } from 'vitest';
import {
  DataNewerThanAppError,
  MigrationError,
  closeStore,
  listExercises,
  openStore,
  restoreFromSnapshot,
  type SchemaStep,
} from '../../src/store';
import { getDb } from '../../src/store/db';
import { SCHEMA_STEPS } from '../../src/store/schemaSteps';
import * as snapshots from '../../src/store/snapshots';

const addTagField: SchemaStep = {
  version: 2,
  stores: {},
  upgrade: (transaction) => transaction.table('exercises').toCollection().modify({ tag: 'v2' }),
};
const failingUpgrade: SchemaStep = {
  version: 2,
  stores: {},
  upgrade: () => {
    throw new Error('upgrade boom');
  },
};

async function seededV1(): Promise<number> {
  await openStore();
  const count = (await listExercises()).length;
  closeStore();
  return count;
}

describe('migration safety', () => {
  it('snapshots the old version first, then upgrades and keeps all data', async () => {
    const count = await seededV1();
    await openStore({ schemaSteps: [...SCHEMA_STEPS, addTagField] });

    const snapshot = await snapshots.readSnapshot(1);
    expect(snapshot?.tables.exercises).toHaveLength(count);
    expect(snapshot?.tables.exercises?.[0]).not.toHaveProperty('tag');
    expect(await getDb().exercises.count()).toBe(count);
    expect(await getDb().exercises.toCollection().first()).toMatchObject({ tag: 'v2' });
    expect((await getDb().meta.get('schemaVersion'))?.value).toBe(2);
  });

  it('keeps v1 data and throws MigrationError when the upgrade fails', async () => {
    const count = await seededV1();
    const error = await openStore({ schemaSteps: [...SCHEMA_STEPS, failingUpgrade] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MigrationError);
    expect(error).toMatchObject({ fromVersion: 1 });
    expect(await snapshots.readSnapshot(1)).toBeDefined();

    await openStore();
    expect((await listExercises()).length).toBe(count);
  });

  it('stops without touching data when the snapshot cannot be saved', async () => {
    await seededV1();
    vi.spyOn(snapshots, 'saveSnapshot').mockRejectedValue(new Error('disk full'));
    await expect(openStore({ schemaSteps: [...SCHEMA_STEPS, addTagField] })).rejects.toBeInstanceOf(MigrationError);
  });

  it('keeps only the last two snapshots', async () => {
    await seededV1();
    const v3: SchemaStep = { version: 3, stores: {} };
    const v4: SchemaStep = { version: 4, stores: {} };
    await openStore({ schemaSteps: [...SCHEMA_STEPS, addTagField] });
    closeStore();
    await openStore({ schemaSteps: [...SCHEMA_STEPS, addTagField, v3] });
    closeStore();
    await openStore({ schemaSteps: [...SCHEMA_STEPS, addTagField, v3, v4] });
    expect(await snapshots.readSnapshot(1)).toBeUndefined();
    expect(await snapshots.readSnapshot(2)).toBeDefined();
    expect(await snapshots.readSnapshot(3)).toBeDefined();
  });

  it('an older app on newer data gets DataNewerThanAppError and can restore from the snapshot', async () => {
    const count = await seededV1();
    await openStore({ schemaSteps: [...SCHEMA_STEPS, addTagField] });
    await getDb().exercises.put({ ...(await getDb().exercises.toCollection().first())!, id: 'added-after-update' });
    closeStore();

    await expect(openStore()).rejects.toBeInstanceOf(DataNewerThanAppError);
    await restoreFromSnapshot();
    expect(await listExercises()).toHaveLength(count);
    expect(await getDb().exercises.get('added-after-update')).toBeUndefined();
  });

  it('restoring without a snapshot throws MigrationError', async () => {
    await expect(restoreFromSnapshot()).rejects.toBeInstanceOf(MigrationError);
  });
});
