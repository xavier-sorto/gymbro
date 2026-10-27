// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { setMeta } from '../../src/store/meta';
import { backupIsDue } from '../../src/ui/data/backupReminder';
import { renderApp, screen, SEED_BENCH } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;

describe('backupIsDue', () => {
  it('is false with no workouts to lose', () => {
    expect(backupIsDue(null, null, null, NOW)).toBe(false);
  });

  it('waits a month after the first workout when never exported', () => {
    expect(backupIsDue(null, NOW - 29 * DAY, NOW, NOW)).toBe(false);
    expect(backupIsDue(null, NOW - 31 * DAY, NOW, NOW)).toBe(true);
  });

  it('waits a month after the last export, and only when something is newer', () => {
    expect(backupIsDue(NOW - 20 * DAY, NOW - 90 * DAY, NOW, NOW)).toBe(false);
    expect(backupIsDue(NOW - 40 * DAY, NOW - 90 * DAY, NOW - 5 * DAY, NOW)).toBe(true);
    expect(backupIsDue(NOW - 40 * DAY, NOW - 90 * DAY, NOW - 50 * DAY, NOW)).toBe(false);
  });
});

describe('backupIsDue with a chosen interval', () => {
  it('uses the days given and is off at 0', () => {
    expect(backupIsDue(null, NOW - 20 * DAY, NOW, NOW, 14)).toBe(true);
    expect(backupIsDue(null, NOW - 20 * DAY, NOW, NOW, 30)).toBe(false);
    expect(backupIsDue(null, NOW - 400 * DAY, NOW, NOW, 0)).toBe(false);
    expect(backupIsDue(NOW - 70 * DAY, NOW - 90 * DAY, NOW, NOW, 60)).toBe(true);
  });
});

describe('backup reminder on Home', () => {
  async function oldWorkout() {
    const workout = await startWorkout(null);
    const entry = await addWorkoutExercise(workout.id, SEED_BENCH);
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, reps: 8, weightLb: 100 });
    await finishWorkout(workout.id);
    const startedAt = Date.now() - 40 * DAY;
    await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 60000 });
  }

  it('links to Backup & data once a month has passed, and goes away after an export', async () => {
    await openStore();
    await oldWorkout();
    window.location.hash = '#/';
    const { unmount } = renderApp();
    const reminder = await screen.findByText(/since your last backup/);
    expect(reminder.closest('a')?.getAttribute('href')).toBe('#/library/data');
    unmount();
    await setMeta('lastFileExportAt', Date.now());
    renderApp();
    await screen.findByText('Start workout');
    expect(screen.queryByText(/since your last backup/)).toBeNull();
  });
});
