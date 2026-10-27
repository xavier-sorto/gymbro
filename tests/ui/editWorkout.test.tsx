// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { finishWorkout, openStore, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { toLocalInput } from '../../src/ui/history/EditWorkoutSheet';
import { fireEvent, renderApp, screen, waitFor, within } from './helpers';

const DAY = 24 * 60 * 60 * 1000;

async function openDetail() {
  await openStore();
  const workout = await startWorkout(null);
  await finishWorkout(workout.id);
  const startedAt = Date.now() - 3 * DAY;
  await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 45 * 60000 });
  window.location.hash = `#/history/${workout.id}`;
  renderApp();
  fireEvent.click(await screen.findByLabelText('Workout menu'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit date and note' }));
  return { workout, startedAt, dialog: await screen.findByRole('dialog', { name: 'Edit workout' }) };
}

describe('toLocalInput', () => {
  it('formats local time the way a datetime-local input expects', () => {
    expect(toLocalInput(new Date(2026, 9, 5, 7, 3).getTime())).toBe('2026-10-05T07:03');
  });
});

describe('edit date and note', () => {
  it('moves the workout and keeps its length, and shows the note', async () => {
    const { workout, startedAt, dialog } = await openDetail();
    const earlier = startedAt - 2 * DAY;
    fireEvent.input(within(dialog).getByLabelText('Date and time'), { target: { value: toLocalInput(earlier) } });
    fireEvent.input(within(dialog).getByLabelText('Note'), { target: { value: 'Hotel gym' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Hotel gym')).toBeTruthy();
    const saved = (await getDb().workouts.get(workout.id))!;
    expect(toLocalInput(saved.startedAt)).toBe(toLocalInput(earlier));
    expect(saved.finishedAt! - saved.startedAt).toBe(45 * 60000);
  });

  it('keeps the exact start time when only the note changes', async () => {
    const { workout, startedAt, dialog } = await openDetail();
    fireEvent.input(within(dialog).getByLabelText('Note'), { target: { value: 'Felt good' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await getDb().workouts.get(workout.id))!.note).toBe('Felt good'));
    expect((await getDb().workouts.get(workout.id))!.startedAt).toBe(startedAt);
  });

  it('refuses a date in the future and says why', async () => {
    const { workout, startedAt, dialog } = await openDetail();
    fireEvent.input(within(dialog).getByLabelText('Date and time'), { target: { value: toLocalInput(Date.now() + 2 * DAY) } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText(/Date must be a time that has already passed/)).toBeTruthy();
    expect((await getDb().workouts.get(workout.id))!.startedAt).toBe(startedAt);
  });
});
