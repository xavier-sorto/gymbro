// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createExercise, getExercise, listExercises, openStore, saveSet, startWorkout } from '../../src/store';
import { fireEvent, renderApp, screen, waitFor, within, SEED_BENCH, SEED_PUSH } from './helpers';
import { workoutExercisesOf } from '../store/helpers';

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

async function openLibrary() {
  await openStore();
  window.location.hash = '#/library';
  renderApp();
  await screen.findByText('Back Squat');
}

async function openEdit(exerciseId: string, expectedName: string) {
  await openStore();
  window.location.hash = `#/library/ex/${exerciseId}`;
  renderApp();
  await screen.findByDisplayValue(expectedName);
}

/** Logs `count` working sets of the exercise in a new workout so it has history. */
async function logSets(exerciseId: string, count: number) {
  const workout = await startWorkout(SEED_PUSH);
  const entry = (await workoutExercisesOf(workout.id)).find((e) => e.exerciseId === exerciseId)!;
  for (let i = 0; i < count; i++) await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
}

describe('Library list', () => {
  it('lists exercises by name, stars main lifts, searches and links to the other screens', async () => {
    await openLibrary();
    const names = Array.from(document.querySelectorAll('.library-row-name')).map((el) => el.textContent?.trim().replace(/ ★$/, ''));
    expect(names).toEqual([...names].sort((a, b) => a!.localeCompare(b!)));
    expect(screen.getAllByLabelText('Main lift').length).toBeGreaterThan(0);
    expect(screen.getByText('Dumbbell Bench Press').parentElement?.querySelector('[aria-label="Main lift"]')).toBeTruthy();

    fireEvent.input(screen.getByLabelText('Search exercises'), { target: { value: 'plank' } });
    expect(screen.queryByText('Back Squat')).toBeNull();
    expect(screen.getByText('Plank')).toBeTruthy();
    fireEvent.input(screen.getByLabelText('Search exercises'), { target: { value: 'zzzz' } });
    expect(screen.getByText(/No exercises match/)).toBeTruthy();

    expect(screen.getByRole('link', { name: /Day types/ }).getAttribute('href')).toBe('#/days');
    expect(screen.getByRole('link', { name: /Backup & data/ }).getAttribute('href')).toBe('#/library/data');
  });

  it('opens the edit screen for a tapped exercise', async () => {
    await openLibrary();
    fireEvent.click(screen.getByText('Back Squat'));
    expect(window.location.hash).toBe(`#/library/ex/${encodeURIComponent('seed-ex-back-squat')}`);
  });
});

describe('Exercise edit', () => {
  it('moves an untouched rep range with the type but leaves a custom range alone', async () => {
    const plain = await (async () => {
      await openStore();
      return createExercise({ name: 'Plain Curl', kind: 'weighted', category: 'compound' });
    })();
    await openEdit(plain.id, 'Plain Curl');
    expect([input('Reps min').value, input('Reps max').value]).toEqual(['8', '10']);
    fireEvent.click(screen.getByRole('button', { name: 'Heavy' }));
    expect([input('Reps min').value, input('Reps max').value]).toEqual(['6', '8']);

    fireEvent.input(input('Reps min'), { target: { value: '5' } });
    fireEvent.input(input('Reps max'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Isolation' }));
    expect([input('Reps min').value, input('Reps max').value]).toEqual(['5', '7']);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(window.location.hash).toBe('#/library'));
    const saved = await getExercise(plain.id);
    expect([saved.category, saved.repMin, saved.repMax]).toEqual(['isolation', 5, 7]);
  });

  it('warns before changing the kind of an exercise with history; Cancel keeps the old kind', async () => {
    await openStore();
    await logSets(SEED_BENCH, 2);
    await openEdit(SEED_BENCH, 'Dumbbell Bench Press');
    fireEvent.click(screen.getByRole('button', { name: 'Bodyweight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText("Past sets logged as Weights won't count toward targets or charts.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(pressed('Weights')).toBe('true');
    expect((await getExercise(SEED_BENCH)).kind).toBe('weighted');

    fireEvent.click(screen.getByRole('button', { name: 'Bodyweight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Change kind' }));
    await waitFor(async () => expect((await getExercise(SEED_BENCH)).kind).toBe('bodyweight'));
  });

  it('changes the kind without a warning when there is no history', async () => {
    await openStore();
    const fresh = await createExercise({ name: 'Fresh Move', kind: 'weighted', category: 'compound' });
    await openEdit(fresh.id, 'Fresh Move');
    fireEvent.click(screen.getByRole('button', { name: 'Timed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect((await getExercise(fresh.id)).kind).toBe('timed'));
  });

  it('shows a validation message on the form and keeps the typed values', async () => {
    await openStore();
    const fresh = await createExercise({ name: 'Fresh Move', kind: 'weighted', category: 'compound' });
    await openEdit(fresh.id, 'Fresh Move');
    fireEvent.input(input('Reps min'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/repMax/);
    expect(input('Reps min').value).toBe('12');
    expect((await getExercise(fresh.id)).repMin).toBe(8);
  });

  it('offers Merge when the new name already exists, and merges into that exercise', async () => {
    await openStore();
    const fresh = await createExercise({ name: 'Fresh Move', kind: 'weighted', category: 'compound' });
    await openEdit(fresh.id, 'Fresh Move');
    fireEvent.input(input('Name'), { target: { value: 'Plank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Merge into Plank' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Merge into Plank' }));
    await waitFor(async () => expect((await getExercise(fresh.id)).mergedInto).toBe('seed-ex-plank'));
  });
});

describe('Merge and delete', () => {
  it('shows the set count, merges, and the merged exercise leaves the list', async () => {
    await openStore();
    await logSets(SEED_BENCH, 3);
    await openEdit(SEED_BENCH, 'Dumbbell Bench Press');
    fireEvent.click(screen.getByRole('button', { name: 'Merge into another exercise' }));
    const dialog = await screen.findByRole('dialog');
    expect(Array.from(dialog.querySelectorAll('li')).map((li) => li.textContent)).not.toContain('Dumbbell Bench Press');
    fireEvent.click(await screen.findByRole('button', { name: 'Back Squat' }));
    expect(await screen.findByText(/3 sets will move from Dumbbell Bench Press to Back Squat/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Merge into Back Squat' }));
    await waitFor(() => expect(window.location.hash).toBe('#/library'));
    await screen.findByText('Back Squat');
    expect(screen.queryByText('Dumbbell Bench Press')).toBeNull();
    expect((await listExercises()).some((e) => e.id === SEED_BENCH)).toBe(false);
  });

  it('hides Delete for an exercise with sets and shows Has history, merge instead', async () => {
    await openStore();
    await logSets(SEED_BENCH, 1);
    await openEdit(SEED_BENCH, 'Dumbbell Bench Press');
    expect(screen.queryByRole('button', { name: 'Delete exercise' })).toBeNull();
    expect(screen.getByText('Has history, merge instead')).toBeTruthy();
  });

  it('deletes an exercise without sets after a confirm', async () => {
    await openStore();
    const fresh = await createExercise({ name: 'Fresh Move', kind: 'weighted', category: 'compound' });
    await openEdit(fresh.id, 'Fresh Move');
    expect(screen.queryByText('Has history, merge instead')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete exercise' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(window.location.hash).toBe('#/library'));
    expect((await listExercises()).some((e) => e.id === fresh.id)).toBe(false);
  });
});
