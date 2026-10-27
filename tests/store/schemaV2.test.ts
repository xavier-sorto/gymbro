import { beforeEach, describe, expect, it } from 'vitest';
import {
  ImportError,
  ValidationError,
  addBodyweight,
  closeStore,
  deleteBodyweight,
  exportBackup,
  getExercise,
  importBackup,
  listBodyweights,
  listExercises,
  openStore,
  updateExercise,
  updateWorkoutDetails,
} from '../../src/store';
import { getDb } from '../../src/store/db';
import { readAllData } from '../../src/store/readAllData';
import { SCHEMA_STEPS } from '../../src/store/schemaSteps';
import * as snapshots from '../../src/store/snapshots';
import { SEED_BENCH, SEED_PUSH, finishedWorkoutWith } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const jsonFile = (value: unknown) => new File([JSON.stringify(value)], 'x.json');

describe('upgrading real version 1 data to version 2', () => {
  it('keeps every record, takes a safety copy first and adds the weigh-in table', async () => {
    await openStore({ schemaSteps: SCHEMA_STEPS.slice(0, 1) });
    const workout = await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
    // a version 1 database has no weigh-in table, so read the three tables that exist
    const read = () => Promise.all(['workouts', 'sets', 'exercises'].map((name) => getDb().table(name).toArray()));
    const before = await read();
    closeStore();

    await openStore();

    expect((await snapshots.readSnapshot(1))?.tables.workouts).toHaveLength(1);
    expect((await getDb().meta.get('schemaVersion'))?.value).toBe(2);
    expect(await read()).toEqual(before);
    expect(await getDb().workouts.get(workout.id)).not.toHaveProperty('note');
    expect(await listBodyweights()).toEqual([]);
    await addBodyweight({ weightLb: 180 });
    expect(await listBodyweights()).toHaveLength(1);
  });
});

describe('backups across versions', () => {
  beforeEach(async () => {
    await openStore();
    await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
  });

  it('imports a version 1 file that has no weigh-ins', async () => {
    const backup = JSON.parse(await (await exportBackup()).text());
    const { bodyweights: _gone, ...v1Data } = backup.data;
    await importBackup(jsonFile({ ...backup, schemaVersion: 1, data: v1Data }));
    expect((await readAllData()).bodyweights).toEqual([]);
    expect((await readAllData()).workouts).toHaveLength(1);
  });

  it('round trips the new fields and weigh-ins', async () => {
    await updateExercise(SEED_BENCH, { notes: 'Elbows at 45 degrees', favorite: true, archived: false });
    const workout = (await getDb().workouts.toCollection().first())!;
    await updateWorkoutDetails(workout.id, { note: 'Felt strong' });
    await addBodyweight({ weightLb: 181.4 });
    const original = await readAllData();
    const file = await exportBackup();
    for (const name of ['exercises', 'workouts', 'bodyweights']) await getDb().table(name).clear();
    await importBackup(file);
    expect(await readAllData()).toEqual(original);
    expect((await getExercise(SEED_BENCH)).notes).toBe('Elbows at 45 degrees');
  });

  it.each([
    ['notes that are too long', 'exercises', (r: Record<string, unknown>) => (r.notes = 'x'.repeat(501))],
    ['a favorite flag that is not true or false', 'exercises', (r: Record<string, unknown>) => (r.favorite = 'yes')],
    ['a workout note that is not text', 'workouts', (r: Record<string, unknown>) => (r.note = 7)],
    ['an impossible body weight', 'bodyweights', (r: Record<string, unknown>) => (r.weightLb = 5)],
  ])('rejects %s and changes nothing', async (_name, table, damage) => {
    await addBodyweight({ weightLb: 180 });
    const backup = JSON.parse(await (await exportBackup()).text());
    damage(backup.data[table][0]);
    const before = await readAllData();
    const error = await importBackup(jsonFile(backup)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImportError);
    expect(error).toMatchObject({ reason: 'invalid-record', table });
    expect(await readAllData()).toEqual(before);
  });
});

describe('weigh-ins', () => {
  beforeEach(() => openStore());

  it('lists newest first, rounds to a tenth, and hides deleted ones', async () => {
    const old = await addBodyweight({ weightLb: 180.04, measuredAt: Date.now() - 3 * DAY });
    const recent = await addBodyweight({ weightLb: 179.26 });
    expect((await listBodyweights()).map((entry) => entry.weightLb)).toEqual([179.3, 180]);
    await deleteBodyweight(recent.id);
    expect((await listBodyweights()).map((entry) => entry.id)).toEqual([old.id]);
  });

  it.each([[5], [2000], [Number.NaN]])('refuses %s lb', async (weightLb) => {
    await expect(addBodyweight({ weightLb })).rejects.toBeInstanceOf(ValidationError);
    expect(await listBodyweights()).toEqual([]);
  });
});

describe('exercise extras', () => {
  beforeEach(() => openStore());

  it('saves notes, favorite and archived and leaves the other fields alone', async () => {
    const before = await getExercise(SEED_BENCH);
    const saved = await updateExercise(SEED_BENCH, { notes: '  Pause on the chest  ', favorite: true, archived: true });
    expect(saved).toMatchObject({ notes: 'Pause on the chest', favorite: true, archived: true, name: before.name, repMax: before.repMax });
    expect((await listExercises()).some((exercise) => exercise.id === SEED_BENCH)).toBe(true);
  });

  it('refuses long notes and non-boolean flags', async () => {
    await expect(updateExercise(SEED_BENCH, { notes: 'x'.repeat(501) })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateExercise(SEED_BENCH, { favorite: 'yes' as unknown as boolean })).rejects.toBeInstanceOf(ValidationError);
    expect((await getExercise(SEED_BENCH)).notes).toBeUndefined();
  });
});

describe('workout details', () => {
  it('moves the start and the finish together, and saves a note', async () => {
    await openStore();
    const workout = await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
    const duration = workout.finishedAt! - workout.startedAt;
    const earlier = Date.now() - 5 * DAY;
    const saved = await updateWorkoutDetails(workout.id, { startedAt: earlier, note: ' Deload week ' });
    expect(saved.startedAt).toBe(earlier);
    expect(saved.finishedAt! - saved.startedAt).toBe(duration);
    expect(saved.note).toBe('Deload week');
  });

  it('refuses a start in the future and a note over 500 characters', async () => {
    await openStore();
    const workout = await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
    await expect(updateWorkoutDetails(workout.id, { startedAt: Date.now() + DAY })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateWorkoutDetails(workout.id, { note: 'x'.repeat(501) })).rejects.toBeInstanceOf(ValidationError);
    expect((await getDb().workouts.get(workout.id))!.startedAt).toBe(workout.startedAt);
  });
});
