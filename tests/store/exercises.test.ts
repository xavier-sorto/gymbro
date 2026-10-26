import { beforeEach, describe, expect, it } from 'vitest';
import {
  DuplicateNameError, ValidationError, createDayType, createExercise, deleteDayType, deleteExercise,
  findSimilarExercises, getExerciseHistory, listDayTypes, listExercises, mergeExercises, openStore,
  updateDayType, updateExercise,
} from '../../src/store';
import { getDb } from '../../src/store/db';
import { SEED_BENCH, finishedWorkoutWith, newWeightedExercise, outboxCount } from './helpers';

beforeEach(openStore);

describe('exercises', () => {
  it('refuses a duplicate name after normalising, naming the seed id', async () => {
    const error = await createExercise({ name: 'dumbbell  bench press!', kind: 'weighted', category: 'heavy' }).catch((e) => e);
    expect(error).toBeInstanceOf(DuplicateNameError);
    expect(error.existingId).toBe(SEED_BENCH);
  });

  it.each(['Dumbell Bench', 'bench press', 'Dumbell Bench Press'])('finds Dumbbell Bench Press for %s', async (typed) => {
    const names = (await findSimilarExercises(typed)).map((e) => e.name);
    expect(names).toContain('Dumbbell Bench Press');
  });

  it('matches only exactly under five characters', async () => {
    const curl = await createExercise({ name: 'Curl', kind: 'weighted', category: 'isolation' });
    await createExercise({ name: 'Curls', kind: 'weighted', category: 'isolation' });
    expect((await findSimilarExercises('Curl')).map((e) => e.id)).toEqual([curl.id]);
  });

  it('never returns more than five', async () => {
    for (let i = 0; i < 7; i++) {
      await createExercise({ name: `Cable Fly ${i}`, kind: 'weighted', category: 'isolation' });
    }
    expect(await findSimilarExercises('Cable Fly')).toHaveLength(5);
  });

  it('applies category defaults and validates fields', async () => {
    const created = await createExercise({ name: '  Face Pull ', kind: 'weighted', category: 'isolation' });
    expect(created).toMatchObject({ name: 'Face Pull', nameKey: 'face pull', repMin: 10, repMax: 15, restSeconds: 90, warmupSets: 2 });
    await expect(createExercise({ name: '', kind: 'weighted', category: 'heavy' })).rejects.toMatchObject({ field: 'name' });
    await expect(updateExercise(created.id, { restSeconds: 5 })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateExercise(created.id, { name: 'Lateral Raise' })).rejects.toBeInstanceOf(DuplicateNameError);
    expect((await updateExercise(created.id, { name: 'Face Pulls' })).nameKey).toBe('face pulls');
  });

  it('adds exactly one outbox row per changed record, and none for a failed write', async () => {
    const start = await outboxCount();
    const created = await newWeightedExercise('Cable Crunch');
    expect(await outboxCount()).toBe(start + 1);
    await updateExercise(created.id, { restSeconds: 45 });
    await deleteExercise(created.id);
    expect(await outboxCount()).toBe(start + 3);
    await expect(newWeightedExercise('Lateral Raise')).rejects.toBeInstanceOf(DuplicateNameError);
    expect(await outboxCount()).toBe(start + 3);
  });

  it('deletes unused exercises softly and refuses ones with sets', async () => {
    await finishedWorkoutWith([SEED_BENCH], 'seed-day-push');
    await expect(deleteExercise(SEED_BENCH)).rejects.toBeInstanceOf(ValidationError);
    const unused = await newWeightedExercise('Shrug');
    await deleteExercise(unused.id);
    expect((await listExercises()).some((e) => e.id === unused.id)).toBe(false);
    expect((await getDb().exercises.get(unused.id))?.deleted).toBe(true);
  });

  it('merges: moves sets and templates, hides the source, keeps history, one outbox row per record', async () => {
    const twin = await newWeightedExercise('DB Bench');
    await finishedWorkoutWith([SEED_BENCH], 'seed-day-push');
    await finishedWorkoutWith([SEED_BENCH], 'seed-day-push');
    const day = await createDayType({ name: 'Custom' });
    await updateDayType(day.id, { exerciseIds: [twin.id, SEED_BENCH], mainLiftIds: [twin.id] });
    await finishedWorkoutWith([twin.id]);
    expect(await getExerciseHistory(twin.id)).toHaveLength(1);
    const before = await outboxCount();
    const merged = await mergeExercises(twin.id, SEED_BENCH);
    expect(merged.mergedInto).toBe(SEED_BENCH);
    expect(await outboxCount()).toBe(before + 4); // 1 set + 1 workout exercise + 1 day type + the exercise
    expect((await listExercises()).some((e) => e.id === twin.id)).toBe(false);
    expect((await listDayTypes()).find((d) => d.id === day.id)).toMatchObject({ exerciseIds: [SEED_BENCH], mainLiftIds: [SEED_BENCH] });
    expect(await getExerciseHistory(SEED_BENCH)).toHaveLength(3);
    await expect(mergeExercises(SEED_BENCH, SEED_BENCH)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('day types', () => {
  it('validates templates and soft deletes', async () => {
    const day = await createDayType({ name: 'Arms' });
    expect(day.order).toBe(6);
    await expect(updateDayType(day.id, { exerciseIds: ['nope'] })).rejects.toBeInstanceOf(ValidationError);
    await expect(updateDayType(day.id, { exerciseIds: [SEED_BENCH], mainLiftIds: ['seed-ex-plank'] })).rejects.toMatchObject({ field: 'mainLiftIds' });
    await deleteDayType(day.id);
    expect((await listDayTypes()).some((d) => d.id === day.id)).toBe(false);
  });
});
