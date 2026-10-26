// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import type { ExerciseSession } from '../../src/store/history';
import { fireEvent, renderApp, screen, SEED_BENCH } from './helpers';

const mocks = vi.hoisted(() => ({ history: null as unknown, fails: false }));

vi.mock('../../src/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store')>();
  return {
    ...actual,
    getExerciseHistory: (...args: Parameters<typeof actual.getExerciseHistory>) => {
      if (mocks.fails) return Promise.reject(new Error('history boom'));
      return mocks.history ? Promise.resolve(mocks.history as ExerciseSession[]) : actual.getExerciseHistory(...args);
    },
  };
});

const openProgress = async (exerciseId = SEED_BENCH) => {
  await openStore();
  window.location.hash = `#/progress/${exerciseId}`;
  renderApp();
};

async function logFinishedSession(reps: number[]) {
  const workout = await startWorkout(null);
  const entry = await addWorkoutExercise(workout.id, SEED_BENCH);
  for (const rep of reps) await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 65, reps: rep });
  await finishWorkout(workout.id);
}

describe('progress chart screen', () => {
  it('shows No sessions yet when the exercise has no history', async () => {
    mocks.history = null;
    await openProgress();
    expect(await screen.findByText('No sessions yet')).toBeTruthy();
    expect(screen.getByText('Dumbbell Bench Press')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows one point, the best set and the session row for a single session', async () => {
    mocks.history = null;
    await openStore();
    await logFinishedSession([8, 8, 7]);
    await openProgress();
    expect(await screen.findByText('Best so far')).toBeTruthy();
    expect(screen.getByText('65 × 8, 8, 7')).toBeTruthy();
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(1);
    expect(screen.getByText('Heaviest weight (lb)')).toBeTruthy();
    expect(screen.getByText('Volume')).toBeTruthy();
  });

  it('says Showing the last 500 sessions only on All, when there are more', async () => {
    const now = Date.now();
    mocks.history = Array.from({ length: 501 }, (_, index): ExerciseSession => ({
      workoutId: `w${index}`, startedAt: now - index * 86_400_000, isMainLift: false,
      sets: [{ id: `s${index}`, updatedAt: 0, deleted: false, workoutId: `w${index}`, workoutExerciseId: 'we', exerciseId: SEED_BENCH, order: 0, isWarmup: false, reps: 5, weightLb: 60, seconds: null, savedAt: 0 }],
    }));
    await openProgress();
    await screen.findByText('Best so far');
    expect(screen.queryByText('Showing the last 500 sessions')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(await screen.findByText('Showing the last 500 sessions')).toBeTruthy();
    expect(document.querySelectorAll('.session-row')).toHaveLength(500);
  });

  it('shows an actionable error and logs it when loading fails', async () => {
    mocks.history = null;
    mocks.fails = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await openProgress();
      expect(await screen.findByText(/Couldn't load this exercise's progress/)).toBeTruthy();
      expect(log).toHaveBeenCalled();
    } finally {
      mocks.fails = false;
    }
  });

  it('shows an error for an exercise that does not exist', async () => {
    mocks.history = null;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await openProgress('nope');
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
