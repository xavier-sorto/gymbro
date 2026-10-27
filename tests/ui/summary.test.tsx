// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { loadWorkoutSummary, MISSING_WORKOUT, volumeOf } from '../../src/ui/history/historyData';
import { renderApp, screen, SEED_BENCH, SEED_PUSH } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const SQUAT = 'seed-ex-back-squat';

/** A finished Push workout `daysAgo` days ago; each lift is [exercise id, [weight, reps][]]. */
async function push(daysAgo: number, lifts: [string, [number, number][]][], dayTypeId: string | null = SEED_PUSH) {
  const workout = await startWorkout(dayTypeId);
  for (const [exerciseId, sets] of lifts) {
    const entry = await addWorkoutExercise(workout.id, exerciseId);
    for (const [weightLb, reps] of sets) await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb, reps });
  }
  await finishWorkout(workout.id);
  const startedAt = Date.now() - daysAgo * DAY;
  await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 50 * 60000 });
  return workout;
}

const openSummary = (id: string) => {
  window.location.hash = `#/summary/${id}`;
  renderApp();
};

describe('volumeOf', () => {
  it('multiplies weight by reps over working sets only', () => {
    const set = (weightLb: number | null, reps: number | null, isWarmup = false) => ({ weightLb, reps, isWarmup }) as never;
    expect(volumeOf([set(100, 5), set(50, 10, true), set(null, 12), set(20, null)])).toBe(500);
    expect(volumeOf([])).toBe(0);
  });
});

describe('workout summary', () => {
  it('shows the totals and compares volume with the last workout of the same day type', async () => {
    await openStore();
    await push(7, [[SEED_BENCH, [[100, 8], [100, 8]]]]);
    const latest = await push(0, [[SEED_BENCH, [[105, 8], [105, 8], [105, 8]]]]);
    openSummary(latest.id);
    expect(await screen.findByText('Workout saved')).toBeTruthy();
    expect(screen.getByText('Sets').nextElementSibling?.textContent).toBe('3');
    expect(screen.getByText('Volume').nextElementSibling?.textContent).toBe('2,520 lb');
    expect(screen.getByText('+920 lb compared with your last Push')).toBeTruthy();
  });

  it('lists a record once, and lifts that moved up without a record separately', async () => {
    await openStore();
    await push(14, [[SEED_BENCH, [[100, 8]]], [SQUAT, [[200, 5]]]]);
    await push(7, [[SEED_BENCH, [[110, 8]]], [SQUAT, [[200, 5]]]]);
    // bench: new record. squat: the same as before. overhead press: first time ever, so neither.
    const latest = await push(0, [[SEED_BENCH, [[115, 8]]], [SQUAT, [[200, 5]]], ['seed-ex-overhead-press', [[65, 8]]]]);
    openSummary(latest.id);
    expect(await screen.findByText('New record')).toBeTruthy();
    expect(screen.getByText('115 × 8')).toBeTruthy();
    expect(screen.queryByText('Moved up')).toBeNull();
    expect(screen.getAllByText('Dumbbell Bench Press')).toHaveLength(1);
    expect(screen.queryByText('Back Squat')).toBeNull();
    expect(screen.queryByText('Overhead Press')).toBeNull();
  });

  it('shows "Moved up" for a lift that improved on last time but is not the best ever', async () => {
    await openStore();
    await push(21, [[SEED_BENCH, [[130, 8]]]]);
    await push(14, [[SEED_BENCH, [[100, 8]]]]);
    const latest = await push(0, [[SEED_BENCH, [[105, 8]]]]);
    openSummary(latest.id);
    expect(await screen.findByText('Moved up')).toBeTruthy();
    expect(screen.getByText('+5 lb')).toBeTruthy();
    expect(screen.queryByText('New record')).toBeNull();
  });

  it('shows nothing to compare for a first workout, and has no volume line', async () => {
    await openStore();
    const only = await push(0, [[SEED_BENCH, [[100, 8]]]]);
    openSummary(only.id);
    await screen.findByText('Workout saved');
    expect(screen.queryByText(/compared with your last/)).toBeNull();
    expect(screen.queryByText('New record')).toBeNull();
  });

  it('copes with an empty workout and an unfinished or missing one', async () => {
    await openStore();
    const empty = await push(0, []);
    openSummary(empty.id);
    expect(await screen.findByText('No working sets were logged in this workout.')).toBeTruthy();

    const unfinished = await startWorkout(SEED_PUSH);
    expect(await loadWorkoutSummary(unfinished.id)).toBe(MISSING_WORKOUT);
    expect(await loadWorkoutSummary('nope')).toBe(MISSING_WORKOUT);
  });

  it('marks records on the workout detail screen too', async () => {
    await openStore();
    await push(7, [[SEED_BENCH, [[100, 8]]]]);
    const latest = await push(0, [[SEED_BENCH, [[110, 8]]]]);
    window.location.hash = `#/history/${latest.id}`;
    renderApp();
    expect(await screen.findByText('Record')).toBeTruthy();
  });
});
