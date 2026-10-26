import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach } from 'vitest';
import { getActiveWorkout, startWorkout } from '../../src/store';
import { openStore, getExerciseHistory, listSets } from '../../src/store';
import { App } from '../../src/ui/App';
import { resetRestTimerMemory } from '../../src/ui/rest/restTimer';

export const SEED_PUSH = 'seed-day-push';
export const SEED_BENCH = 'seed-ex-db-bench';

beforeEach(() => {
  window.sessionStorage.clear();
  resetRestTimerMemory();
  window.location.hash = '';
});

afterEach(cleanup);

export function renderApp() {
  return render(<App />);
}

/** Opens the store, starts a Push workout, then renders the app (which resumes it). */
export async function renderInActivePush() {
  await openStore();
  await startWorkout(SEED_PUSH);
  const view = renderApp();
  await screen.findByText('Dumbbell Bench Press'); // the app has re-opened the store
  return view;
}

export async function openExercise(name: string) {
  fireEvent.click(await screen.findByText(new RegExp(name)));
}

export async function activeSets(exerciseId: string) {
  const workout = await getActiveWorkout();
  const { getDb } = await import('../../src/store/db');
  const entry = (await getDb().workoutExercises.where('workoutId').equals(workout!.id).toArray()).find((e) => e.exerciseId === exerciseId);
  return listSets(entry!.id);
}

export { fireEvent, screen, waitFor, within, getExerciseHistory };
