// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  addWorkoutExercise,
  createExercise,
  finishWorkout,
  getExercise,
  mergeExercises,
  openStore,
  saveSet,
  startWorkout,
} from '../../src/store';
import { getDb } from '../../src/store/db';
import { listExercises } from '../../src/store';
import { weekRange } from '../../src/ui/volume/volumeData';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor, SEED_BENCH } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const SQUAT = 'seed-ex-back-squat';

/** A finished workout `daysAgo` days ago with `count` working sets (and optionally a warm-up) of one exercise. */
async function logged(exerciseId: string, count: number, daysAgo = 0, withWarmup = false) {
  const workout = await startWorkout(null);
  const entry = await addWorkoutExercise(workout.id, exerciseId);
  if (withWarmup) await saveSet({ workoutExerciseId: entry.id, isWarmup: true, weightLb: 45, reps: 5 });
  for (let i = 0; i < count; i++) await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
  await finishWorkout(workout.id);
  const startedAt = Date.now() - daysAgo * DAY;
  await getDb().workouts.update(workout.id, { startedAt, finishedAt: startedAt + 60000 });
  return workout;
}

const row = (name: string) => screen.getByText(name, { selector: '.volume-name' }).closest('.volume-row') as HTMLElement;

async function openVolume() {
  window.location.hash = '#/volume';
  renderApp();
  await screen.findByText('Weekly volume');
}

describe('weekRange', () => {
  it('runs Monday to the next Monday, and steps back whole weeks', () => {
    const wednesday = new Date(2026, 9, 28, 15).getTime();
    expect(weekRange(0, wednesday)).toEqual({ start: new Date(2026, 9, 26).getTime(), end: new Date(2026, 10, 2).getTime() });
    expect(weekRange(1, wednesday).start).toBe(new Date(2026, 9, 19).getTime());
  });
});

describe('weekly volume screen', () => {
  it('shows working sets by muscle with half credit for helpers, and leaves warm-ups out', async () => {
    await openStore();
    await logged(SEED_BENCH, 3, 0, true);
    await openVolume();
    await waitFor(() => expect(row('Chest').textContent).toContain('3 sets'));
    expect(row('Chest').textContent).toContain('Under target');
    expect(row('Triceps').textContent).toContain('1.5 sets');
    expect(row('Back').textContent).toContain('0 sets');
  });

  it('switches to last week, which does not include this week', async () => {
    await openStore();
    await logged(SEED_BENCH, 3, 0);
    await logged(SQUAT, 4, 7);
    await openVolume();
    await waitFor(() => expect(row('Chest').textContent).toContain('3 sets'));
    expect(row('Quads').textContent).toContain('0 sets');
    fireEvent.click(screen.getByRole('button', { name: 'Last week' }));
    await waitFor(() => expect(row('Quads').textContent).toContain('4 sets'));
    expect(row('Glutes').textContent).toContain('2 sets');
    expect(row('Chest').textContent).toContain('0 sets');
  });

  it('marks a week past the top of the range as above target', async () => {
    await openStore();
    await logged(SEED_BENCH, 12);
    await logged(SEED_BENCH, 9, 0);
    await openVolume();
    await waitFor(() => expect(row('Chest').textContent).toContain('21 sets'));
    expect(row('Chest').textContent).toContain('Above target');
  });

  it('counts sets of a merged exercise toward the exercise it was merged into', async () => {
    await openStore();
    const flat = await createExercise({ name: 'Flat Bench', kind: 'weighted', category: 'heavy' });
    await logged(flat.id, 2);
    await mergeExercises(flat.id, SEED_BENCH);
    await openVolume();
    await waitFor(() => expect(row('Chest').textContent).toContain('2 sets'));
  });

  it('points at exercises that have no muscle set', async () => {
    await openStore();
    const custom = await createExercise({ name: 'Landmine Press', kind: 'weighted', category: 'compound' });
    await logged(custom.id, 3);
    await openVolume();
    const link = await screen.findByText(/3 sets from exercises with no muscle set/);
    expect(link.closest('a')?.getAttribute('href')).toBe('#/library');
  });

  it('is linked from History', async () => {
    await openStore();
    await logged(SEED_BENCH, 1);
    window.location.hash = '#/history';
    renderApp();
    const link = await screen.findByText('Weekly volume by muscle');
    expect(link.closest('a')?.getAttribute('href')).toBe('#/volume');
  });
});

describe('the warning about exercises with no muscle', () => {
  it('sits above the muscle rows, where it is hard to miss', async () => {
    await openStore();
    const custom = await createExercise({ name: 'Landmine Press', kind: 'weighted', category: 'compound' });
    await logged(custom.id, 5);
    await openVolume();
    const warning = (await screen.findByText(/5 sets from exercises with no muscle set are not counted/)).closest('a')!;
    expect(warning.compareDocumentPosition(row('Chest')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is not shown when every set belongs to a muscle', async () => {
    await openStore();
    await logged(SEED_BENCH, 2);
    await openVolume();
    await waitFor(() => expect(row('Chest').textContent).toContain('2 sets'));
    expect(screen.queryByText(/not counted/)).toBeNull();
  });
});

describe('choosing muscles when creating an exercise', () => {
  async function openCreate(name: string) {
    await renderInActivePush();
    fireEvent.click(await screen.findByRole('button', { name: 'Add exercise' }));
    fireEvent.input(await screen.findByLabelText('Search exercises'), { target: { value: name } });
    fireEvent.click(await screen.findByRole('button', { name: `Create "${name}"` }));
    return (await screen.findByLabelText(/^Main muscle/)) as HTMLSelectElement;
  }

  it('saves the main muscle and helpers with the new exercise, so its sets count right away', async () => {
    const select = await openCreate('Dumbbell Overhead Press');
    expect(select.value).toBe('');
    fireEvent.change(select, { target: { value: 'shoulders' } });
    fireEvent.click(screen.getByRole('button', { name: 'Triceps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(window.location.hash).toBe('#/workout'));
    await waitFor(async () => {
      const made = (await listExercises()).find((exercise) => exercise.name === 'Dumbbell Overhead Press');
      expect(made).toMatchObject({ primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'] });
    });
  });

  it('still creates an exercise with no muscle chosen', async () => {
    await openCreate('Zottman Curl');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(window.location.hash).toBe('#/workout'));
    await waitFor(async () => {
      const made = (await listExercises()).find((exercise) => exercise.name === 'Zottman Curl');
      expect(made).toBeDefined();
      expect(made!.primaryMuscle).toBeUndefined();
    });
  });
});

describe('choosing muscles on the exercise edit screen', () => {
  it('starts from the starter muscles and saves a different main muscle, dropping it from the helpers', async () => {
    await openStore();
    window.location.hash = `#/library/ex/${SEED_BENCH}`;
    renderApp();
    const select = (await screen.findByLabelText(/^Main muscle/)) as HTMLSelectElement;
    expect(select.value).toBe('chest');
    expect(screen.getByRole('button', { name: 'Triceps' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(select, { target: { value: 'triceps' } });
    expect(screen.queryByRole('button', { name: 'Triceps' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect(await getExercise(SEED_BENCH)).toMatchObject({ primaryMuscle: 'triceps', secondaryMuscles: ['shoulders', 'back'] }),
    );
  });

  it('lets a custom exercise be given muscles, and stops at four helpers', async () => {
    await openStore();
    const custom = await createExercise({ name: 'Landmine Press', kind: 'weighted', category: 'compound' });
    window.location.hash = `#/library/ex/${custom.id}`;
    renderApp();
    const select = (await screen.findByLabelText(/^Main muscle/)) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.queryByText(/Also works/)).toBeNull();
    fireEvent.change(select, { target: { value: 'shoulders' } });
    for (const name of ['Chest', 'Triceps', 'Abs', 'Back']) fireEvent.click(screen.getByRole('button', { name }));
    expect((screen.getByRole('button', { name: 'Calves' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect(await getExercise(custom.id)).toMatchObject({ primaryMuscle: 'shoulders', secondaryMuscles: ['chest', 'triceps', 'abs', 'back'] }),
    );
  });

  it('clears the helpers when the main muscle is set to none', async () => {
    await openStore();
    window.location.hash = `#/library/ex/${SEED_BENCH}`;
    renderApp();
    fireEvent.change(await screen.findByLabelText(/^Main muscle/), { target: { value: '' } });
    expect(screen.queryByText(/Also works/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await getExercise(SEED_BENCH)).toMatchObject({ primaryMuscle: null, secondaryMuscles: [] }));
  });
});
