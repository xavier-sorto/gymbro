// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { fireEvent, renderInActivePush, screen, SEED_BENCH } from './helpers';

const DAY = 24 * 60 * 60 * 1000;

async function finishedBench(daysAgo: number, weightLb: number, reps: number) {
  const workout = await startWorkout(null);
  const entry = await addWorkoutExercise(workout.id, SEED_BENCH);
  await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb, reps });
  await finishWorkout(workout.id);
  const startedAt = Date.now() - daysAgo * DAY;
  await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 60000 });
}

async function openBench() {
  await renderInActivePush();
  fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
  await screen.findByLabelText('Weight');
}

describe('warm-ups and the stall note on the exercise screen', () => {
  it('lists the suggested warm-ups and starts the logger on the first one', async () => {
    await openStore();
    await finishedBench(7, 100, 6);
    await openBench();
    expect(await screen.findByText(/^Warm-up:/)).toBeTruthy();
    expect((screen.getByLabelText('Warm-up') as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(/Stuck for/)).toBeNull();
  });

  it('warns after three sessions without progress and offers a lighter set', async () => {
    await openStore();
    for (const daysAgo of [28, 21, 14, 7]) await finishedBench(daysAgo, 100, 6);
    await openBench();
    expect(await screen.findByText(/Stuck for 3 sessions\. Try 90 × 8 to reset\./)).toBeTruthy();
  });
});
