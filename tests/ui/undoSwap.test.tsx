// @vitest-environment happy-dom
import { act, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteSet, getActiveWorkout, listSets, openStore, saveSet, startWorkout } from '../../src/store';
import { UNDO_MS, UndoToast } from '../../src/ui/components/UndoToast';
import { workoutExercisesOf } from '../store/helpers';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor, within, SEED_BENCH, SEED_PUSH } from './helpers';

const type = (label: string, value: string) => fireEvent.input(screen.getByLabelText(label), { target: { value } });
const saveButton = () => screen.getByRole('button', { name: /Save set|Retry/ });

async function openBench() {
  await renderInActivePush();
  fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
  await screen.findByLabelText('Weight');
}

async function benchEntry() {
  const workout = (await getActiveWorkout())!;
  return (await workoutExercisesOf(workout.id)).find((entry) => entry.exerciseId === SEED_BENCH)!;
}

afterEach(() => vi.useRealTimers());

describe('UndoToast', () => {
  it('expires after six seconds, and Undo runs the undo', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const onUndo = vi.fn();
    render(<UndoToast id={1} message="Set saved" onUndo={onUndo} onExpire={onExpire} />);
    act(() => void vi.advanceTimersByTime(UNDO_MS - 1));
    expect(onExpire).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledOnce();
    act(() => void vi.advanceTimersByTime(1));
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('starts counting again for a new offer, and not when only re-rendered', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const { rerender } = render(<UndoToast id={1} message="a" onUndo={() => {}} onExpire={onExpire} />);
    act(() => void vi.advanceTimersByTime(4000));
    rerender(<UndoToast id={1} message="a" onUndo={() => {}} onExpire={onExpire} />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(onExpire).toHaveBeenCalledOnce();
    rerender(<UndoToast id={2} message="b" onUndo={() => {}} onExpire={onExpire} />);
    act(() => void vi.advanceTimersByTime(5999));
    expect(onExpire).toHaveBeenCalledOnce();
  });
});

describe('undoing a set', () => {
  it('removes a set just saved, and stops the rest timer it started', async () => {
    await openBench();
    type('Weight', '65');
    type('Reps', '7');
    fireEvent.click(saveButton());
    expect(await screen.findByText('Set saved')).toBeTruthy();
    const entry = await benchEntry();
    await waitFor(async () => expect((await listSets(entry.id)).length).toBe(1));
    expect(screen.getByRole('timer')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await listSets(entry.id)).toEqual([]));
    await waitFor(() => expect(screen.queryByText('Set saved')).toBeNull());
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('offers to bring back a set that was deleted from the edit sheet', async () => {
    await openBench();
    const entry = await benchEntry();
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    window.location.hash = '#/workout';
    await screen.findAllByLabelText('Exercise menu');
    fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
    fireEvent.click(await screen.findByRole('button', { name: /100 × 8/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit set' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete set' }));
    expect(await screen.findByText('Set deleted')).toBeTruthy();
    await waitFor(async () => expect(await listSets(entry.id)).toEqual([]));

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect((await listSets(entry.id)).map((set) => set.weightLb)).toEqual([100]));
    expect(await screen.findByRole('button', { name: /100 × 8/ })).toBeTruthy();
  });

  it('says so when the undo cannot be done', async () => {
    await openBench();
    type('Weight', '65');
    type('Reps', '7');
    fireEvent.click(saveButton());
    await screen.findByText('Set saved');
    const entry = await benchEntry();
    await waitFor(async () => expect((await listSets(entry.id)).length).toBe(1));
    // the set is already gone, so deleting it again fails
    await deleteSet((await listSets(entry.id))[0]!.id);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText("Couldn't undo that.")).toBeTruthy();
  });
});

describe('swapping an exercise in a workout', () => {
  async function openMenuOnFirstCard() {
    await renderInActivePush();
    fireEvent.click(screen.getAllByLabelText('Exercise menu')[0]!);
  }

  it('replaces an exercise that has no sets', async () => {
    await openMenuOnFirstCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Swap exercise' }));
    const dialog = await screen.findByRole('dialog', { name: 'Swap exercise' });
    fireEvent.input(within(dialog).getByLabelText('Search exercises'), { target: { value: 'Plank' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Plank' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('Plank')).toBeTruthy();
    expect(screen.queryByText('Dumbbell Bench Press')).toBeNull();
  });

  it('is not offered once the exercise has sets', async () => {
    await openStore();
    const workout = await startWorkout(SEED_PUSH);
    const entry = (await workoutExercisesOf(workout.id)).find((e) => e.exerciseId === SEED_BENCH)!;
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    renderApp();
    await screen.findByText('Dumbbell Bench Press');
    fireEvent.click(screen.getAllByLabelText('Exercise menu')[0]!);
    expect(await screen.findByRole('button', { name: 'Remove' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Swap exercise' })).toBeNull();
  });
});

