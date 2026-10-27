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
  it('counts only working sets, opens the summary, and Done returns home', async () => {
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
    expect(await screen.findByText('Workout saved')).toBeTruthy();
    expect(window.location.hash).toMatch(/^#\/summary\/.+/);
    expect(screen.getByText('Sets').nextElementSibling?.textContent).toBe('2');
    expect(screen.getByText('Volume').nextElementSibling?.textContent).toBe('1,040 lb');
    expect(await getActiveWorkout()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(window.location.hash).toBe('#/'));
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
