// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, listSets, listWorkouts, openStore, saveSet, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { SEED_BENCH, SEED_PUSH, workoutExercisesOf } from '../store/helpers';
import { fireEvent, renderApp, screen, waitFor, within } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const OVERHEAD_PRESS = 'seed-ex-overhead-press';

/** A finished Push workout started `daysAgo` days ago (distinct start times keep paging exact); optionally with a warm-up on the first exercise. */
async function finishedPush(daysAgo: number, exerciseIds = [SEED_BENCH], withWarmup = false) {
  const workout = await startWorkout(SEED_PUSH);
  for (const [index, exerciseId] of exerciseIds.entries()) {
    const entry = (await workoutExercisesOf(workout.id)).find((e) => e.exerciseId === exerciseId) ?? (await addWorkoutExercise(workout.id, exerciseId));
    if (withWarmup && index === 0) await saveSet({ workoutExerciseId: entry.id, isWarmup: true, reps: 5, weightLb: 45 });
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, reps: 8, weightLb: 100 });
  }
  await finishWorkout(workout.id);
  const startedAt = Date.now() - daysAgo * DAY;
  await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 45 * 60000 });
  return workout;
}

describe('history list', () => {
  it('shows the empty state when nothing is finished', async () => {
    await openStore();
    window.location.hash = '#/history';
    renderApp();
    expect(await screen.findByText('No workouts yet: start one from Workout.')).toBeTruthy();
  });

  it('shows 50 rows, then Load more shows all 60; the active workout is not listed', async () => {
    await openStore();
    for (let i = 1; i <= 60; i++) await finishedPush(i);
    await startWorkout(SEED_PUSH);
    window.location.hash = '#/history';
    renderApp();
    await screen.findByText('Load more');
    expect(document.querySelectorAll('.history-row')).toHaveLength(50);
    fireEvent.click(screen.getByText('Load more'));
    await waitFor(() => expect(document.querySelectorAll('.history-row')).toHaveLength(60));
    expect(screen.queryByText('Load more')).toBeNull();
    expect((await listWorkouts({ limit: 100 })).some((w) => w.finishedAt === null)).toBe(false);
  }, 60000);

  it('counts working sets only and names the first three exercises', async () => {
    await openStore();
    await finishedPush(1, [SEED_BENCH, OVERHEAD_PRESS], true);
    window.location.hash = '#/history';
    renderApp();
    const row = await screen.findByText(/2 sets/); // 2 working sets, the warm-up is not counted
    expect(row.textContent).toMatch(/min · 2 sets/);
    expect(screen.getByText('Dumbbell Bench Press, Overhead Press')).toBeTruthy();
    expect(screen.getByText('Push')).toBeTruthy();
  });
});

describe('history filters and delete from the list', () => {
  async function finishedPull(daysAgo: number) {
    const workout = await startWorkout('seed-day-pull');
    await finishWorkout(workout.id);
    const startedAt = Date.now() - daysAgo * DAY;
    await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 45 * 60000 });
    return workout;
  }

  it('filters by day type', async () => {
    await openStore();
    await finishedPush(1);
    await finishedPush(2);
    await finishedPull(3);
    window.location.hash = '#/history';
    renderApp();
    await waitFor(() => expect(document.querySelectorAll('.history-row')).toHaveLength(3));
    fireEvent.change(screen.getByLabelText('Day type'), { target: { value: 'Pull' } });
    await waitFor(() => expect(document.querySelectorAll('.history-row')).toHaveLength(1));
    expect(document.querySelector('.history-title')?.textContent).toBe('Pull');
  });

  it('searches every exercise of a workout, not only the first three shown', async () => {
    await openStore();
    await finishedPush(1, [SEED_BENCH, OVERHEAD_PRESS, 'seed-ex-lateral-raise', 'seed-ex-triceps-pushdown']);
    await finishedPush(2, [SEED_BENCH]);
    window.location.hash = '#/history';
    renderApp();
    await waitFor(() => expect(document.querySelectorAll('.history-row')).toHaveLength(2));
    fireEvent.input(screen.getByLabelText('Search exercises'), { target: { value: 'pushdown' } });
    await waitFor(() => expect(document.querySelectorAll('.history-row')).toHaveLength(1));
    fireEvent.input(screen.getByLabelText('Search exercises'), { target: { value: 'squat' } });
    expect(await screen.findByText('No workouts match.')).toBeTruthy();
  });

  it('deletes a workout from the list after confirming, and leaves a plain link row when not editing', async () => {
    await openStore();
    const gone = await finishedPush(1);
    const kept = await finishedPush(2);
    window.location.hash = '#/history';
    renderApp();
    await waitFor(() => expect(document.querySelectorAll('a.history-row')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: /Delete Push workout/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Push workout' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Delete this workout?' });
    expect(dialog.textContent).toMatch(/all 1 set will be deleted/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete workout' }));
    await waitFor(() => expect(document.querySelectorAll('.history-row')).toHaveLength(1));
    const remaining = (await listWorkouts()).map((w) => w.id);
    expect(remaining).toContain(kept.id);
    expect(remaining).not.toContain(gone.id);
  });
});

describe('workout detail', () => {
  async function openDetail(withWarmup = false) {
    await openStore();
    const workout = await finishedPush(2, [SEED_BENCH], withWarmup);
    const entry = (await workoutExercisesOf(workout.id))[0]!;
    window.location.hash = `#/history/${workout.id}`;
    renderApp();
    await screen.findByText('Dumbbell Bench Press');
    return { workout, entry };
  }

  it('lists sets, links the exercise name to its progress and edits a set', async () => {
    const { entry } = await openDetail();
    const link = screen.getAllByText('Dumbbell Bench Press')[0]!.closest('a')!;
    expect(link.getAttribute('href')).toBe(`#/progress/${SEED_BENCH}`);
    fireEvent.click(screen.getByLabelText('Edit set 1'));
    const dialog = await screen.findByRole('dialog', { name: 'Edit set' });
    fireEvent.input(within(dialog).getByLabelText('Reps'), { target: { value: '12' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save set' }));
    await waitFor(async () => expect((await listSets(entry.id))[0]!.reps).toBe(12));
    await waitFor(() => expect(screen.getByLabelText('Edit set 1').textContent).toContain('12'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('deletes a set from the sheet', async () => {
    const { entry } = await openDetail();
    fireEvent.click(screen.getByLabelText('Edit set 1'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete set' }));
    await waitFor(async () => expect(await listSets(entry.id)).toHaveLength(0));
  });

  it('marks warm-ups with W', async () => {
    await openDetail(true);
    expect(document.querySelectorAll('.detail-set')).toHaveLength(2);
    expect(document.querySelectorAll('.detail-set .set-mark')).toHaveLength(1);
  });

  it('deletes the workout after the confirm names the date and set count, and returns to a list without it', async () => {
    const { workout } = await openDetail();
    fireEvent.click(screen.getByLabelText('Workout menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete workout' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this workout?' });
    expect(dialog.textContent).toMatch(/Push, \w{3}, \w{3} \d+: all \d+ sets? will be deleted/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete workout' }));
    await waitFor(() => expect(window.location.hash).toBe('#/history'));
    expect(await screen.findByText('No workouts yet: start one from Workout.')).toBeTruthy();
    expect((await listWorkouts()).some((w) => w.id === workout.id)).toBe(false);
  });

  it('says so when the workout no longer exists', async () => {
    await openStore();
    window.location.hash = '#/history/gone';
    renderApp();
    expect(await screen.findByText("This workout isn't in your history any more.")).toBeTruthy();
  });
});
