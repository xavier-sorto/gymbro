// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { getActiveWorkout, getDayType } from '../../src/store';
import { fireEvent, renderInActivePush, screen, waitFor, SEED_PUSH, SEED_BENCH } from './helpers';
import { workoutExercisesOf } from '../store/helpers';

async function openAddWith(text: string) {
  await renderInActivePush();
  fireEvent.click(await screen.findByRole('button', { name: 'Add exercise' }));
  fireEvent.input(await screen.findByLabelText('Search exercises'), { target: { value: text } });
}

describe('add exercise', () => {
  it('adds an existing exercise found by search', async () => {
    await openAddWith('Plank');
    fireEvent.click(await screen.findByRole('button', { name: 'Plank' }));
    await waitFor(() => expect(window.location.hash).toBe('#/workout'));
    expect(await screen.findByText('Plank')).toBeTruthy();
  });

  it('offers Did you mean on a near-miss; Use this adds the existing exercise', async () => {
    await openAddWith('Dumbell Bench Press');
    fireEvent.click(await screen.findByRole('button', { name: 'Create "Dumbell Bench Press"' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    expect(await screen.findByText(/Did you mean/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Dumbbell Bench Press — Use this/ }));
    await waitFor(async () => {
      const entries = await workoutExercisesOf((await getActiveWorkout())!.id);
      expect(entries.filter((e) => e.exerciseId === SEED_BENCH)).toHaveLength(2);
    });
  });

  it('Create anyway with Also add to Push adds it to the workout and the Push template', async () => {
    await openAddWith('Dumbell Bench Press');
    fireEvent.click(await screen.findByRole('button', { name: 'Create "Dumbell Bench Press"' }));
    fireEvent.click(await screen.findByLabelText(/Also add to Push/));
    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create anyway' }));
    await waitFor(() => expect(window.location.hash).toBe('#/workout'));
    expect((await getDayType(SEED_PUSH)).exerciseIds).toHaveLength(7);
    expect(await workoutExercisesOf((await getActiveWorkout())!.id)).toHaveLength(7);
  });

  it('leaves the template alone when Also add is off', async () => {
    await openAddWith('Zottman Curl');
    fireEvent.click(await screen.findByRole('button', { name: 'Create "Zottman Curl"' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    await waitFor(() => expect(window.location.hash).toBe('#/workout'));
    expect((await getDayType(SEED_PUSH)).exerciseIds).toHaveLength(6);
  });
});
