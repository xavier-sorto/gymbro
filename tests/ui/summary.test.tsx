// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, getActiveWorkout, listWorkouts, openStore, saveSet, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { loadWorkoutSummary, MISSING_WORKOUT, volumeOf } from '../../src/ui/history/historyData';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor, within, SEED_BENCH, SEED_PUSH } from './helpers';

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
    const records = document.querySelector('.summary-records') as HTMLElement;
    expect(within(records).getAllByText('Dumbbell Bench Press')).toHaveLength(1);
    expect(within(records).queryByText('Back Squat')).toBeNull();
    expect(within(records).queryByText('Overhead Press')).toBeNull();
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

describe('next time and this week on the summary', () => {
  it('lists what the guide will ask for next time, only for lifts that were done', async () => {
    await openStore();
    const latest = await push(0, [[SEED_BENCH, [[100, 8]]], [SQUAT, [[200, 5]]]]);
    await addWorkoutExercise(latest.id, 'seed-ex-overhead-press'); // added but never logged
    openSummary(latest.id);
    const card = (await screen.findByText('Next time')).closest('section') as HTMLElement;
    // 100 x 8 hits the top of the 6-8 range, so bench goes up 5 lb and back to 6 reps
    expect(within(card).getByText('Dumbbell Bench Press').nextElementSibling?.textContent).toBe('105 × 6');
    expect(within(card).getByText('Back Squat')).toBeTruthy();
    expect(within(card).queryByText('Overhead Press')).toBeNull();
  });

  it('shows progress toward the weekly range for the muscles trained, furthest behind first', async () => {
    await openStore();
    const latest = await push(0, [[SEED_BENCH, [[100, 8], [100, 8], [100, 8]]], [SQUAT, [[200, 5]]]]);
    openSummary(latest.id);
    const card = (await screen.findByText('This week')).closest('section') as HTMLElement;
    const rows = [...card.querySelectorAll('.summary-row')].map((row) => row.textContent);
    // chest: 3 of 12 (9 missing); quads: 1 of 10 (9 missing, tie keeps list order)
    expect(rows).toEqual(expect.arrayContaining(['Chest3 of 12', 'Quads1 of 10']));
    expect(rows).toHaveLength(2);
  });

  it('marks a muscle that has reached its range', async () => {
    await openStore();
    const latest = await push(0, [[SEED_BENCH, Array.from({ length: 12 }, (): [number, number] => [100, 8])]]);
    openSummary(latest.id);
    const row = (await screen.findByText('Chest')).closest('.summary-row') as HTMLElement;
    expect(row.textContent).toBe('Chest12 of 12');
    expect(row.querySelector('.up')).not.toBeNull();
  });
});

describe('finishing a workout with nothing logged', () => {
  async function openFinishSheet() {
    await renderInActivePush();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish workout' }));
    return screen.findByRole('dialog', { name: 'Finish workout' });
  }

  it('offers to discard it instead of saving, and discarding removes it', async () => {
    await openStore();
    const dialog = await openFinishSheet();
    expect(await within(dialog).findByText('No sets were logged, so there is nothing to save.')).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'Finish' })).toBeNull();
    const workout = (await getActiveWorkout())!;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Discard workout' }));
    await waitFor(() => expect(window.location.hash).toBe('#/'));
    await waitFor(async () => expect(await getActiveWorkout()).toBeNull());
    expect((await listWorkouts()).some((other) => other.id === workout.id)).toBe(false);
    expect((await getDb().workouts.get(workout.id))?.deleted).toBe(true);
  });

  it('treats a workout with only warm-ups as empty', async () => {
    await openStore();
    const workout = await startWorkout(SEED_PUSH);
    const entry = (await getDb().workoutExercises.where('workoutId').equals(workout.id).toArray())[0]!;
    await saveSet({ workoutExerciseId: entry.id, isWarmup: true, weightLb: 45, reps: 5 });
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Finish workout' }));
    const dialog = await screen.findByRole('dialog', { name: 'Finish workout' });
    expect(await within(dialog).findByRole('button', { name: 'Discard workout' })).toBeTruthy();
  });

  it('can still be saved on purpose, and the summary shows no volume comparison', async () => {
    await openStore();
    await push(7, [[SEED_BENCH, [[100, 8]]]], SEED_PUSH);
    const dialog = await openFinishSheet();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Save it anyway' }));
    expect(await screen.findByText('No working sets were logged in this workout.')).toBeTruthy();
    expect(screen.queryByText(/compared with your last/)).toBeNull();
    expect(screen.queryByText('Next time')).toBeNull();
    expect(screen.queryByText('This week')).toBeNull();
  });
});
