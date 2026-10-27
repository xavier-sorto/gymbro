import { beforeEach, describe, expect, it } from 'vitest';
import { ImportError, ValidationError, exportBackup, getExercise, importBackup, openStore, updateExercise } from '../../src/store';
import { getDb } from '../../src/store/db';
import { readAllData } from '../../src/store/readAllData';
import { SEED_BENCH } from './helpers';

const jsonFile = (value: unknown) => new File([JSON.stringify(value)], 'x.json');

describe('exercise muscles', () => {
  beforeEach(() => openStore());

  it('saves a main muscle and secondary muscles', async () => {
    const saved = await updateExercise(SEED_BENCH, { primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'] });
    expect(saved).toMatchObject({ primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'] });
  });

  it('lets the owner clear the main muscle, which is different from never having set one', async () => {
    expect((await getExercise(SEED_BENCH)).primaryMuscle).toBeUndefined();
    const cleared = await updateExercise(SEED_BENCH, { primaryMuscle: null });
    expect(cleared.primaryMuscle).toBeNull();
  });

  it.each([
    ['an unknown main muscle', { primaryMuscle: 'wings' as never }],
    ['an unknown secondary muscle', { secondaryMuscles: ['wings' as never] }],
    ['a repeated secondary muscle', { secondaryMuscles: ['triceps', 'triceps'] as never }],
    ['more than four secondary muscles', { secondaryMuscles: ['triceps', 'biceps', 'back', 'abs', 'calves'] as never }],
    ['the main muscle among the secondary ones', { primaryMuscle: 'chest' as const, secondaryMuscles: ['chest' as const] }],
  ])('refuses %s and changes nothing', async (_name, patch) => {
    await expect(updateExercise(SEED_BENCH, patch)).rejects.toBeInstanceOf(ValidationError);
    expect((await getExercise(SEED_BENCH)).secondaryMuscles).toBeUndefined();
  });

  it('round trips through a backup, and rejects bad muscles in a file', async () => {
    await updateExercise(SEED_BENCH, { primaryMuscle: 'chest', secondaryMuscles: ['triceps'] });
    const original = await readAllData();
    const file = await exportBackup();
    await getDb().exercises.clear();
    await importBackup(file);
    expect(await readAllData()).toEqual(original);

    const backup = JSON.parse(await (await exportBackup()).text());
    backup.data.exercises[0].secondaryMuscles = ['wings'];
    const error = await importBackup(jsonFile(backup)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImportError);
    expect(error).toMatchObject({ reason: 'invalid-record', table: 'exercises' });
  });
});
