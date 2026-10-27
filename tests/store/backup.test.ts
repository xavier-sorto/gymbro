import { beforeEach, describe, expect, it } from 'vitest';
import { ImportError, exportBackup, importBackup, openStore } from '../../src/store';
import { getDb } from '../../src/store/db';
import { readAllData } from '../../src/store/readAllData';
import { DATA_TABLE_NAMES, SCHEMA_VERSION } from '../../src/store/types';
import { SEED_BENCH, SEED_PUSH, finishedWorkoutWith, outboxCount } from './helpers';

async function expectImportError(file: Blob, reason: string, table?: string) {
  const before = [await readAllData(), await getDb().outbox.toArray()];
  const error = await importBackup(file).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ImportError);
  expect(error).toMatchObject({ reason, table });
  expect([await readAllData(), await getDb().outbox.toArray()]).toEqual(before);
}

const jsonFile = (value: unknown) => new File([JSON.stringify(value)], 'x.json');

describe('backup file', () => {
  beforeEach(async () => {
    await openStore();
    await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
  });

  it('round trips: export, clear, import gives identical tables and one outbox row per record', async () => {
    const original = await readAllData();
    const file = await exportBackup();
    expect(file.type).toBe('application/json');
    expect(file.name).toMatch(/^gymbro-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect((await getDb().meta.get('lastFileExportAt'))?.value).toEqual(expect.any(Number));

    for (const name of DATA_TABLE_NAMES) await getDb().table(name).clear();
    await getDb().outbox.clear();
    await importBackup(file);

    expect(await readAllData()).toEqual(original);
    const records = DATA_TABLE_NAMES.reduce((sum, name) => sum + original[name].length, 0);
    expect(await outboxCount()).toBe(records);
  });

  it('keeps soft-deleted records in the file', async () => {
    const original = await readAllData();
    const deleted = { ...original.sets[0]!, deleted: true };
    await getDb().sets.put(deleted);
    const parsed = JSON.parse(await (await exportBackup()).text());
    expect(parsed.data.sets.find((s: { id: string }) => s.id === deleted.id).deleted).toBe(true);
    expect(parsed).toMatchObject({ app: 'gymbro', schemaVersion: SCHEMA_VERSION });
  });

  it('refuses a file that is not a GymBro backup', async () => {
    await expectImportError(jsonFile({ hello: 'world' }), 'not-gymbro');
    await expectImportError(new File(['not json'], 'x.json'), 'not-gymbro');
  });

  it('refuses a backup from a newer version', async () => {
    await expectImportError(jsonFile({ app: 'gymbro', schemaVersion: 99, exportedAt: 1, data: {} }), 'newer-version');
  });

  it('names the table and index of a damaged record', async () => {
    const parsed = JSON.parse(await (await exportBackup()).text());
    parsed.data.sets[0].reps = -1;
    await expectImportError(jsonFile(parsed), 'invalid-record', 'sets');
    const error = await importBackup(jsonFile(parsed)).catch((e: unknown) => e);
    expect(error).toMatchObject({ index: 0 });
  });

  it('refuses a backup with a missing table', async () => {
    const parsed = JSON.parse(await (await exportBackup()).text());
    delete parsed.data.workouts;
    await expectImportError(jsonFile(parsed), 'invalid-record', 'workouts');
  });

  it('refuses a file over 20 MB', async () => {
    await expectImportError(new File([new Uint8Array(21 * 1024 * 1024)], 'big.json'), 'too-large');
  });
});
