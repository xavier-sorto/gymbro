// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/preact';
import { addWorkoutExercise, finishWorkout, getActiveWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { loadSuggestion, type Suggestion } from '../../src/ui/volume/suggestion';
import { SuggestionCard } from '../../src/ui/volume/SuggestionCard';
import { workoutExercisesOf } from '../store/helpers';
import { fireEvent, renderApp, renderInActivePush, screen, SEED_BENCH } from './helpers';

/** A finished workout today with `count` working sets of each listed exercise. */
async function logWeek(lifts: [string, number][]) {
  const workout = await startWorkout(null);
  for (const [exerciseId, count] of lifts) {
    const entry = await addWorkoutExercise(workout.id, exerciseId);
    for (let i = 0; i < count; i++) await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
  }
  await finishWorkout(workout.id);
}

const UPPER_BODY_WEEK: [string, number][] = [
  [SEED_BENCH, 12],
  ['seed-ex-barbell-row', 14],
  ['seed-ex-overhead-press', 8],
  ['seed-ex-barbell-curl', 6],
  ['seed-ex-rear-delt-fly', 2],
];

describe('the suggestion card', () => {
  const fit = { dayTypeId: 'legs', covers: 21.5, muscles: ['quads', 'hamstrings'] as const };
  const base: Suggestion = {
    behind: [
      { muscle: 'quads', sets: 0, goal: 10, missing: 10 },
      { muscle: 'hamstrings', sets: 1.5, goal: 8, missing: 6.5 },
    ],
    totalMissing: 30,
    fit: { ...fit, muscles: [...fit.muscles], dayType: { id: 'legs', name: 'Legs' } as never },
  };

  it('recommends a day type, explains why, and starts it on tap', () => {
    const onStart = vi.fn();
    render(<SuggestionCard suggestion={base} onStart={onStart} />);
    expect(screen.getByText('Suggested today')).toBeTruthy();
    expect(screen.getByText(/Fills about 22 of the 30 sets you still need this week, mostly quads, hamstrings\./)).toBeTruthy();
    expect(screen.getByText('Furthest behind: Quads 0 of 10 · Hamstrings 1.5 of 8').closest('a')?.getAttribute('href')).toBe('#/volume');
    fireEvent.click(screen.getByRole('button', { name: 'Start Legs' }));
    expect(onStart).toHaveBeenCalledWith('legs');
  });

  it('says so when no day type would help, without a start button', () => {
    render(<SuggestionCard suggestion={{ ...base, fit: null }} onStart={() => {}} />);
    expect(screen.getByText(/None of your day types train what is missing/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says on track when nothing is behind', () => {
    render(<SuggestionCard suggestion={{ behind: [], totalMissing: 0, fit: null }} onStart={() => {}} />);
    expect(screen.getByText('On track')).toBeTruthy();
    expect(screen.queryByText('Suggested today')).toBeNull();
  });
});

describe('suggestion on Home', () => {
  it('is not shown before there is any finished workout', async () => {
    await openStore();
    expect(await loadSuggestion()).toBeNull();
    window.location.hash = '#/';
    renderApp();
    await screen.findByText('Start workout');
    expect(screen.queryByText('Suggested today')).toBeNull();
  });

  it('suggests Legs after a week of upper-body training, and starts it', async () => {
    await openStore();
    await logWeek(UPPER_BODY_WEEK);
    const suggestion = await loadSuggestion();
    expect(suggestion?.fit?.dayType.name).toBe('Legs');
    expect(suggestion?.behind.some((gap) => gap.muscle === 'chest')).toBe(false);

    window.location.hash = '#/';
    renderApp();
    expect(await screen.findByText(/Fills about \d+ of the \d+ sets you still need this week/)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Legs' }));
    await screen.findByText('Back Squat');
    expect((await getActiveWorkout())?.dayTypeId).toBe('seed-day-legs');
  });

  it('is hidden while a workout is in progress', async () => {
    await openStore();
    await logWeek(UPPER_BODY_WEEK);
    await startWorkout('seed-day-push');
    window.location.hash = '#/';
    renderApp();
    await screen.findByText('In progress');
    expect(screen.queryByText('Suggested today')).toBeNull();
  });
});

describe('still needed this week, inside a workout', () => {
  const strip = () => document.querySelector('.needs-strip');

  it('lists the muscles this workout trains that are short, at most four', async () => {
    await renderInActivePush();
    await screen.findByText('Still needed this week');
    const chips = [...document.querySelectorAll('.needs-chip')].map((chip) => chip.textContent);
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.length).toBeLessThanOrEqual(4);
    // Push trains chest, shoulders and triceps, so those, not legs
    expect(chips.join(' ')).not.toMatch(/Quads|Hamstrings|Back/);
    expect(strip()?.getAttribute('href')).toBe('#/volume');
  });

  it('drops a muscle once its weekly minimum is reached, counting this workout', async () => {
    await renderInActivePush();
    await screen.findByText('Still needed this week');
    const workout = (await getActiveWorkout())!;
    const bench = (await workoutExercisesOf(workout.id)).find((entry) => entry.exerciseId === SEED_BENCH)!;
    for (let i = 0; i < 12; i++) await saveSet({ workoutExerciseId: bench.id, isWarmup: false, weightLb: 100, reps: 8 });
    window.location.hash = '#/';
    await screen.findByText('In progress');
    window.location.hash = '#/workout';
    await screen.findByText('Still needed this week');
    const chips = [...document.querySelectorAll('.needs-chip')].map((chip) => chip.textContent ?? '');
    expect(chips.some((chip) => chip.startsWith('Chest'))).toBe(false);
  });
});
