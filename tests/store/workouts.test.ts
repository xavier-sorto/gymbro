import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StorageFullError, ValidationError, addWorkoutExercise, deleteSet, deleteWorkout, finishWorkout, getActiveWorkout,
  getExerciseHistory, listSets, listWorkouts, openStore, removeWorkoutExercise, saveSet, startWorkout, updateSet,
  updateWorkoutExercise,
} from '../../src/store';
import { getDb } from '../../src/store/db';
import { SEED_BENCH, SEED_PUSH, failPuts, finishedWorkoutWith, outboxCount, workoutExercisesOf } from './helpers';

beforeEach(openStore);

async function pushWorkout() {
  const workout = await startWorkout(SEED_PUSH);
  const entries = await workoutExercisesOf(workout.id);
  return { workout, entries, bench: entries[0]! };
}

const failingField = (promise: Promise<unknown>) => promise.catch((e) => (e instanceof ValidationError ? e.field : e));

describe('workouts', () => {
  it('starts from a template, never twice, finishes and lists finished only', async () => {
    const { workout, entries } = await pushWorkout();
    expect(entries).toHaveLength(6);
    expect(entries.map((e) => e.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(entries.filter((e) => e.isMainLift).map((e) => e.exerciseId)).toEqual([SEED_BENCH]);
    expect((await startWorkout(null)).id).toBe(workout.id);
    expect(await listWorkouts()).toHaveLength(0);
    const finished = await finishWorkout(workout.id);
    expect(finished.finishedAt).not.toBeNull();
    expect(await getActiveWorkout()).toBeNull();
    expect((await listWorkouts()).map((w) => w.id)).toEqual([workout.id]);
    const next = await startWorkout(null);
    expect(await workoutExercisesOf(next.id)).toHaveLength(0);
    expect((await addWorkoutExercise(next.id, SEED_BENCH)).order).toBe(1);
  });

  it('lets another exercise be marked as main lift', async () => {
    const { entries } = await pushWorkout();
    const updated = await updateWorkoutExercise(entries[1]!.id, { isMainLift: true, note: 'felt easy' });
    expect(updated).toMatchObject({ isMainLift: true, note: 'felt easy' });
    await expect(updateWorkoutExercise(entries[1]!.id, { note: 'x'.repeat(501) })).rejects.toBeInstanceOf(ValidationError);
  });

  it('deleteWorkout and removeWorkoutExercise soft delete their sets', async () => {
    const { workout, entries, bench } = await pushWorkout();
    await saveSet({ workoutExerciseId: bench.id, isWarmup: false, reps: 8, weightLb: 50 });
    await saveSet({ workoutExerciseId: entries[1]!.id, isWarmup: false, reps: 8, weightLb: 50 });
    await removeWorkoutExercise(bench.id);
    expect(await listSets(bench.id)).toHaveLength(0);
    const before = await outboxCount();
    await deleteWorkout(workout.id);
    expect(await outboxCount()).toBe(before + 1 + 5 + 1); // set, 5 live workout exercises, the workout
    expect(await listSets(entries[1]!.id)).toHaveLength(0);
    expect(await getActiveWorkout()).toBeNull();
  });
});

describe('sets', () => {
  it('rejects values that do not fit the exercise kind, naming the field', async () => {
    const { workout, bench } = await pushWorkout();
    const base = { workoutExerciseId: bench.id, isWarmup: false };
    expect(await failingField(saveSet({ ...base, reps: 8 }))).toBe('weightLb');
    expect(await failingField(saveSet({ ...base, reps: 101, weightLb: 50 }))).toBe('reps');
    expect(await failingField(saveSet({ ...base, reps: 8, weightLb: 47.3 }))).toBe('weightLb');
    expect(await failingField(saveSet({ ...base, reps: 8, weightLb: 50, seconds: 5 }))).toBe('seconds');
    const plank = await addWorkoutExercise(workout.id, 'seed-ex-plank');
    const dips = await addWorkoutExercise(workout.id, 'seed-ex-dips');
    expect(await failingField(saveSet({ workoutExerciseId: plank.id, isWarmup: false, seconds: 0 }))).toBe('seconds');
    expect(await failingField(saveSet({ workoutExerciseId: plank.id, isWarmup: false, reps: 3, seconds: 30 }))).toBe('reps');
    expect(await failingField(saveSet({ workoutExerciseId: dips.id, isWarmup: false, reps: 5, weightLb: 10 }))).toBe('weightLb');
    expect((await saveSet({ workoutExerciseId: dips.id, isWarmup: false, reps: 5 })).weightLb).toBeNull();
    expect((await saveSet({ workoutExerciseId: plank.id, isWarmup: false, seconds: 30 })).reps).toBeNull();
    expect(await getDb().sets.count()).toBe(2);
  });

  it('numbers sets 1, 2, 3, keeps savedAt on update and keeps order after a delete', async () => {
    const { bench } = await pushWorkout();
    const saved = [];
    for (const weightLb of [45, 95, 135]) {
      saved.push(await saveSet({ workoutExerciseId: bench.id, isWarmup: weightLb < 100, reps: 5, weightLb }));
    }
    expect(saved.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(saved.every((s) => s.savedAt > 0)).toBe(true);
    const updated = await updateSet(saved[0]!.id, { weightLb: 50 });
    expect(updated).toMatchObject({ weightLb: 50, savedAt: saved[0]!.savedAt });
    await expect(updateSet(saved[0]!.id, { reps: -1 })).rejects.toMatchObject({ field: 'reps' });
    await deleteSet(saved[1]!.id);
    expect((await listSets(bench.id)).map((s) => s.order)).toEqual([1, 3]);
  });

  it('adds one outbox row per set write and none when validation fails', async () => {
    const { bench } = await pushWorkout();
    const before = await outboxCount();
    const set = await saveSet({ workoutExerciseId: bench.id, isWarmup: false, reps: 5, weightLb: 100 });
    await updateSet(set.id, { reps: 6 });
    await deleteSet(set.id);
    expect(await outboxCount()).toBe(before + 3);
    await expect(saveSet({ workoutExerciseId: bench.id, isWarmup: false, reps: 5 })).rejects.toBeInstanceOf(ValidationError);
    expect(await outboxCount()).toBe(before + 3);
  });

  it('throws StorageFullError on QuotaExceededError and leaves no set or outbox row', async () => {
    const { bench } = await pushWorkout();
    const before = await outboxCount();
    failPuts('sets', new DOMException('full', 'QuotaExceededError'));
    await expect(saveSet({ workoutExerciseId: bench.id, isWarmup: false, reps: 5, weightLb: 100 })).rejects.toBeInstanceOf(StorageFullError);
    vi.restoreAllMocks();
    expect(await getDb().sets.count()).toBe(0);
    expect(await outboxCount()).toBe(before);
  });

  it('retries once after a transient abort, and surfaces a second abort', async () => {
    const { bench } = await pushWorkout();
    const input = { workoutExerciseId: bench.id, isWarmup: false, reps: 5, weightLb: 100 };
    failPuts('sets', new DOMException('aborted', 'AbortError'), 1);
    expect((await saveSet(input)).order).toBe(1);
    vi.restoreAllMocks();
    const before = await outboxCount();
    failPuts('sets', new DOMException('aborted', 'AbortError'));
    await expect(saveSet(input)).rejects.toMatchObject({ name: 'AbortError' });
    vi.restoreAllMocks();
    expect(await getDb().sets.count()).toBe(1);
    expect(await outboxCount()).toBe(before);
  });
});

describe('getExerciseHistory', () => {
  it('returns finished sessions newest first and skips the active workout', async () => {
    const first = await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await finishedWorkoutWith([SEED_BENCH], SEED_PUSH);
    await startWorkout(SEED_PUSH);
    const history = await getExerciseHistory(SEED_BENCH);
    expect(history.map((h) => h.workoutId)).toEqual([second.id, first.id]);
    expect(history[0]).toMatchObject({ isMainLift: true });
    expect(history[0]!.sets).toHaveLength(1);
    expect(await getExerciseHistory(SEED_BENCH, { sessions: 1 })).toHaveLength(1);
  });

  it('answers in under 50 ms with 300 workouts and 6000 sets (median of 5)', async () => {
    const db = getDb();
    const base = { updatedAt: 1, deleted: false };
    const workouts = [], entries = [], sets = [];
    for (let w = 0; w < 300; w++) {
      const workoutId = `w${w}`;
      const startedAt = 1_000_000 + w * 86_400_000;
      workouts.push({ id: workoutId, dayTypeId: null, startedAt, finishedAt: startedAt + 1, ...base });
      for (let e = 0; e < 4; e++) {
        const exerciseId = e === 0 ? SEED_BENCH : `other-${e}`;
        const workoutExerciseId = `${workoutId}-e${e}`;
        entries.push({ id: workoutExerciseId, workoutId, exerciseId, order: e + 1, isMainLift: e === 0, note: '', ...base });
        for (let s = 0; s < 5; s++) {
          sets.push({ id: `${workoutExerciseId}-s${s}`, workoutId, workoutExerciseId, exerciseId, order: s + 1, isWarmup: false, reps: 8, weightLb: 100, seconds: null, savedAt: startedAt + s, ...base });
        }
      }
    }
    await db.workouts.bulkPut(workouts);
    await db.workoutExercises.bulkPut(entries);
    await db.sets.bulkPut(sets);
    expect(sets).toHaveLength(6000);
    const timings: number[] = [];
    let result = await getExerciseHistory(SEED_BENCH);
    for (let run = 0; run < 5; run++) {
      const start = performance.now();
      result = await getExerciseHistory(SEED_BENCH);
      timings.push(performance.now() - start);
    }
    expect(result).toHaveLength(10);
    expect(result[0]!.workoutId).toBe('w299');
    expect(timings.sort((a, b) => a - b)[2]).toBeLessThan(50);
  });
});

describe('empty workouts', () => {
  it('deletes a workout that has no exercises or sets', async () => {
    const workout = await startWorkout(null);
    const deleted = await deleteWorkout(workout.id);
    expect(deleted.deleted).toBe(true);
    expect(await getActiveWorkout()).toBeNull();
  });
});
