// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, createDayType, finishWorkout, listDayTypes, openStore, saveSet, startWorkout } from '../../src/store';
import { fireEvent, renderApp, screen, waitFor, within, SEED_BENCH } from './helpers';

describe('creating and deleting day types', () => {
  it('creates a day type from the list and opens it for editing', async () => {
    await openStore();
    window.location.hash = '#/days';
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'New day type' }));
    const dialog = await screen.findByRole('dialog', { name: 'New day type' });
    fireEvent.input(within(dialog).getByLabelText('New day type name'), { target: { value: 'Arms' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create day type' }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/days\/.+/));
    expect((await listDayTypes()).map((day) => day.name)).toContain('Arms');
    expect(await screen.findByText('Add your first exercise')).toBeTruthy();
  });

  it('refuses an empty name and says why', async () => {
    await openStore();
    window.location.hash = '#/days';
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'New day type' }));
    const dialog = await screen.findByRole('dialog', { name: 'New day type' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create day type' }));
    expect(await within(dialog).findByText(/name/i, { selector: '.field-error' })).toBeTruthy();
    expect(window.location.hash).toBe('#/days');
  });

  it('deletes a day type after confirming, and past workouts keep its name in History', async () => {
    await openStore();
    const day = await createDayType({ name: 'Arms' });
    const workout = await startWorkout(day.id);
    const entry = await addWorkoutExercise(workout.id, SEED_BENCH);
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, reps: 8, weightLb: 50 });
    await finishWorkout(workout.id);
    window.location.hash = `#/days/${day.id}`;
    const { unmount } = renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete day type' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this day type?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete day type' }));
    await waitFor(() => expect(window.location.hash).toBe('#/days'));
    expect((await listDayTypes()).map((d) => d.name)).not.toContain('Arms');
    unmount();
    window.location.hash = '#/history';
    renderApp();
    expect(await screen.findByText('Arms')).toBeTruthy();
  });
});
