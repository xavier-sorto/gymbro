// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addWorkoutExercise, finishWorkout, getActiveWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { workoutExercisesOf } from '../store/helpers';
import { fireEvent, renderInActivePush, screen, waitFor, SEED_BENCH } from './helpers';

const card = (name: string) => screen.getByText(name, { selector: '.card-title' }).closest('.card') as HTMLElement;
const finishButton = () => screen.getByRole('button', { name: 'Finish workout' });

async function logPastBench() {
  const past = await startWorkout(null);
  const entry = await addWorkoutExercise(past.id, SEED_BENCH);
  await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
  await finishWorkout(past.id);
}

describe("today's target on the workout cards", () => {
  it('shows the target for a lift with history and "No sets yet" for a first time', async () => {
    await openStore();
    await logPastBench();
    await renderInActivePush();
    await waitFor(() => expect(card('Dumbbell Bench Press').textContent).toContain('Today 105 × 6'));
    expect(card('Overhead Press').textContent).toContain('No sets yet');
  });

  it('gives way to the logged sets once a working set is saved', async () => {
    await openStore();
    await logPastBench();
    await renderInActivePush();
    await waitFor(() => expect(card('Dumbbell Bench Press').textContent).toContain('Today'));
    const bench = (await workoutExercisesOf((await getActiveWorkout())!.id)).find((entry) => entry.exerciseId === SEED_BENCH)!;
    await saveSet({ workoutExerciseId: bench.id, isWarmup: false, weightLb: 105, reps: 6 });
    window.location.hash = '#/';
    await screen.findByText('In progress');
    window.location.hash = '#/workout';
    await waitFor(() => expect(card('Dumbbell Bench Press').textContent).toContain('1 set'));
    expect(card('Dumbbell Bench Press').textContent).not.toContain('Today');
  });
});

describe('Finish workout', () => {
  it('is quiet until a working set is logged, and a warm-up alone does not count', async () => {
    await openStore();
    await renderInActivePush();
    expect(finishButton().className).toContain('secondary');
    expect(finishButton().className).not.toContain('primary-button');

    const bench = (await workoutExercisesOf((await getActiveWorkout())!.id)).find((entry) => entry.exerciseId === SEED_BENCH)!;
    await saveSet({ workoutExerciseId: bench.id, isWarmup: true, weightLb: 45, reps: 5 });
    window.location.hash = '#/';
    await screen.findByText('In progress');
    window.location.hash = '#/workout';
    await screen.findByText('Dumbbell Bench Press');
    expect(finishButton().className).toContain('secondary');

    await saveSet({ workoutExerciseId: bench.id, isWarmup: false, weightLb: 65, reps: 8 });
    window.location.hash = '#/';
    await screen.findByText('In progress');
    window.location.hash = '#/workout';
    await waitFor(() => expect(finishButton().className).toContain('primary-button'));
  });
});

describe('Next exercise from the logger', () => {
  async function openCard(name: string) {
    await renderInActivePush();
    fireEvent.click(await screen.findByText(name, { selector: '.card-title' }));
    await screen.findByLabelText('Weight');
  }

  it('goes to the following exercise in the workout', async () => {
    await openStore();
    await openCard('Dumbbell Bench Press');
    fireEvent.click(await screen.findByRole('button', { name: /Next: Overhead Press/ }));
    await screen.findByRole('heading', { name: 'Overhead Press' });
    expect(window.location.hash).toMatch(/^#\/workout\/ex\/.+/);
    expect(screen.getByRole('button', { name: /Next: Incline Dumbbell Press/ })).toBeTruthy();
  });

  it('is not offered on the last exercise', async () => {
    await openStore();
    await openCard('Overhead Triceps Extension');
    expect(screen.queryByRole('button', { name: /^Next:/ })).toBeNull();
  });
});
