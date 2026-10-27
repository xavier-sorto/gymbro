import { beforeEach, describe, expect, it } from 'vitest';
import {
  ValidationError,
  addWorkoutExercise,
  createExercise,
  deleteExercise,
  deleteSet,
  deleteWorkout,
  listSets,
  openStore,
  restoreSet,
  saveSet,
  startWorkout,
  swapWorkoutExercise,
  updateWorkoutExercise,
} from '../../src/store';
import { getDb } from '../../src/store/db';
import { SEED_BENCH, SEED_PUSH } from './helpers';

const OVERHEAD = 'seed-ex-overhead-press';

async function activeWithBench() {
  const workout = await startWorkout(SEED_PUSH);
  const entry = (await getDb().workoutExercises.where('workoutId').equals(workout.id).toArray()).find((e) => e.exerciseId === SEED_BENCH)!;
  return { workout, entry };
}

// Dexie wraps an error named NotFoundError in its own, so these check the name rather than the class.
describe('restoreSet', () => {
  beforeEach(() => openStore());

  it('brings back a deleted set exactly as it was', async () => {
    const { entry } = await activeWithBench();
    const set = await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    await deleteSet(set.id);
    expect(await listSets(entry.id)).toEqual([]);
    const restored = await restoreSet(set.id);
    expect(restored).toMatchObject({ id: set.id, weightLb: 100, reps: 8, order: set.order, deleted: false });
    expect(await listSets(entry.id)).toHaveLength(1);
  });

  it('refuses an unknown set, and a set whose workout was deleted', async () => {
    const { workout, entry } = await activeWithBench();
    await expect(restoreSet('nope')).rejects.toMatchObject({ name: 'NotFoundError' });
    const set = await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    await deleteWorkout(workout.id);
    await expect(restoreSet(set.id)).rejects.toMatchObject({ name: 'NotFoundError' });
    expect(await getDb().sets.get(set.id)).toMatchObject({ deleted: true });
  });

  it('keeps the order of the other sets', async () => {
    const { entry } = await activeWithBench();
    const first = await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    const second = await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 105, reps: 8 });
    await deleteSet(first.id);
    await restoreSet(first.id);
    expect((await listSets(entry.id)).map((set) => set.id)).toEqual([first.id, second.id]);
  });
});

describe('swapWorkoutExercise', () => {
  beforeEach(() => openStore());

  it('replaces the exercise and keeps the position and note', async () => {
    const { entry } = await activeWithBench();
    await updateWorkoutExercise(entry.id, { note: 'warm up the shoulders' });
    const swapped = await swapWorkoutExercise(entry.id, OVERHEAD);
    expect(swapped).toMatchObject({ id: entry.id, exerciseId: OVERHEAD, order: entry.order, note: 'warm up the shoulders' });
    expect((await getDb().workoutExercises.get(entry.id))!.exerciseId).toBe(OVERHEAD);
  });

  it('refuses once a set is logged, but allows it again if that set was deleted', async () => {
    const { entry } = await activeWithBench();
    const set = await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    await expect(swapWorkoutExercise(entry.id, OVERHEAD)).rejects.toBeInstanceOf(ValidationError);
    expect((await getDb().workoutExercises.get(entry.id))!.exerciseId).toBe(SEED_BENCH);
    await deleteSet(set.id);
    await expect(swapWorkoutExercise(entry.id, OVERHEAD)).resolves.toMatchObject({ exerciseId: OVERHEAD });
  });

  it('refuses an unknown or deleted exercise and an unknown entry', async () => {
    const { entry } = await activeWithBench();
    await expect(swapWorkoutExercise(entry.id, 'nope')).rejects.toMatchObject({ name: 'NotFoundError' });
    const gone = await createExercise({ name: 'Temporary Lift', kind: 'weighted', category: 'compound' });
    await deleteExercise(gone.id);
    await expect(swapWorkoutExercise(entry.id, gone.id)).rejects.toMatchObject({ name: 'NotFoundError' });
    await expect(swapWorkoutExercise('nope', OVERHEAD)).rejects.toMatchObject({ name: 'NotFoundError' });
    expect((await getDb().workoutExercises.get(entry.id))!.exerciseId).toBe(SEED_BENCH);
  });

  it('works on an exercise added to the workout by hand', async () => {
    const { workout } = await activeWithBench();
    const added = await addWorkoutExercise(workout.id, 'seed-ex-plank');
    await expect(swapWorkoutExercise(added.id, SEED_BENCH)).resolves.toMatchObject({ exerciseId: SEED_BENCH });
  });
});
