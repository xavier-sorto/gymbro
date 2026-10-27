// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createDayType, getActiveWorkout, openStore, saveSet, startWorkout, listSets } from '../../src/store';
import { getDb } from '../../src/store/db';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor } from './helpers';

describe('empty template', () => {
  it('opens a new day type with the Add your first exercise hint', async () => {
    await openStore();
    await createDayType({ name: 'Core' });
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Core' }));
    expect(await screen.findByText('Add your first exercise')).toBeTruthy();
  });
});

describe('finish', () => {
  it('counts only working sets and returns home with a Saved message', async () => {
    await renderInActivePush();
    const workout = (await getActiveWorkout())!;
    const entries = await getDb().workoutExercises.where('workoutId').equals(workout.id).toArray();
    const first = entries[0]!;
    await saveSet({ workoutExerciseId: first.id, isWarmup: true, reps: 5, weightLb: 40 });
    await saveSet({ workoutExerciseId: first.id, isWarmup: false, reps: 8, weightLb: 65 });
    await saveSet({ workoutExerciseId: first.id, isWarmup: false, reps: 8, weightLb: 65 });
    expect((await listSets(first.id)).length).toBe(3);

    fireEvent.click(await screen.findByRole('button', { name: 'Finish workout' }));
    expect(await screen.findByText(/1 exercise · 2 sets/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByText('Saved: Push, 2 sets')).toBeTruthy();
    expect(window.location.hash).toBe('#/');
    expect(await getActiveWorkout()).toBeNull();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Resume/ })).toBeNull());
  });

  it('does not offer to start a second workout while one is active', async () => {
    await openStore();
    await startWorkout('seed-day-push');
    renderApp();
    await screen.findByText('Dumbbell Bench Press');
    expect(screen.queryByRole('button', { name: 'Pull' })).toBeNull();
  });
});
