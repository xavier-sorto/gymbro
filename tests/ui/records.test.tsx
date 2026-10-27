// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor, SEED_BENCH } from './helpers';

const type = (label: string, value: string) => fireEvent.input(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: /Save set/ }));

async function logFinishedBench(weightLb: number, reps: number) {
  const workout = await startWorkout(null);
  const entry = await addWorkoutExercise(workout.id, SEED_BENCH);
  await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb, reps });
  await finishWorkout(workout.id);
}

describe('personal records', () => {
  it('lists the best set per lift with an estimated one-rep max', async () => {
    await openStore();
    await logFinishedBench(100, 5);
    window.location.hash = '#/records';
    renderApp();
    expect(await screen.findByText('Dumbbell Bench Press')).toBeTruthy();
    expect(screen.getByText('100 × 5')).toBeTruthy();
    expect(screen.getByText(/about 117 lb for 1 rep/)).toBeTruthy();
  });

  it('says so when there is nothing to show yet', async () => {
    await openStore();
    window.location.hash = '#/records';
    renderApp();
    expect(await screen.findByText(/best sets will show up here/)).toBeTruthy();
  });

  it('celebrates a set that beats the past best, but not a lighter one', async () => {
    await openStore();
    await logFinishedBench(100, 5);
    await renderInActivePush();
    fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
    await screen.findByLabelText('Weight');
    type('Weight', '95');
    type('Reps', '5');
    save();
    await waitFor(() => expect(screen.getByRole('timer')).toBeTruthy());
    expect(screen.queryByText('New personal best!')).toBeNull();
    type('Weight', '105');
    save();
    expect(await screen.findByText('New personal best!')).toBeTruthy();
  });
});
