// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { getExercise, openStore, updateExercise } from '../../src/store';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor, SEED_BENCH } from './helpers';

const SQUAT = 'seed-ex-back-squat';
const headings = () => [...document.querySelectorAll('.library-letter')].map((el) => el.textContent);

describe('library favorites and archive', () => {
  it('lists favorites first, hides archived exercises, and shows them on request', async () => {
    await openStore();
    await updateExercise(SEED_BENCH, { favorite: true });
    await updateExercise(SQUAT, { archived: true });
    window.location.hash = '#/library';
    renderApp();
    await screen.findByText('Dumbbell Bench Press');
    expect(headings()[0]).toBe('Favorites');
    expect(screen.queryByText('Back Squat')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show archived (1)' }));
    expect(await screen.findByText('Back Squat')).toBeTruthy();
    expect(headings().at(-1)).toBe('Archived');
    fireEvent.click(screen.getByRole('button', { name: 'Hide archived' }));
    await waitFor(() => expect(screen.queryByText('Back Squat')).toBeNull());
  });

  it('is unchanged when nothing is favorited or archived', async () => {
    await openStore();
    window.location.hash = '#/library';
    renderApp();
    await screen.findByText('Dumbbell Bench Press');
    expect(headings()).not.toContain('Favorites');
    expect(headings()).not.toContain('Archived');
    expect(screen.queryByRole('button', { name: /archived/i })).toBeNull();
  });
});

describe('editing form cues, favorite and archived', () => {
  it('saves all three from the exercise edit screen', async () => {
    await openStore();
    window.location.hash = `#/library/ex/${SEED_BENCH}`;
    renderApp();
    fireEvent.input(await screen.findByLabelText('Form cues'), { target: { value: 'Elbows at 45 degrees' } });
    fireEvent.click(screen.getByLabelText(/^Favorite/));
    fireEvent.click(screen.getByLabelText(/^Archived/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect(await getExercise(SEED_BENCH)).toMatchObject({ notes: 'Elbows at 45 degrees', favorite: true, archived: true }),
    );
  });

  it('shows the cues while logging that exercise', async () => {
    await openStore();
    await updateExercise(SEED_BENCH, { notes: 'Pause on the chest' });
    await renderInActivePush();
    fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
    expect(await screen.findByText('Pause on the chest')).toBeTruthy();
  });

  it('keeps archived exercises out of the add-exercise search', async () => {
    await openStore();
    await updateExercise(SQUAT, { archived: true });
    await renderInActivePush();
    window.location.hash = '#/workout/add';
    const search = await screen.findByLabelText('Search exercises');
    fireEvent.input(search, { target: { value: 'squat' } });
    await waitFor(() => expect(screen.queryByText('Back Squat')).toBeNull());
    fireEvent.input(search, { target: { value: 'bench' } });
    expect(await screen.findByText('Dumbbell Bench Press')).toBeTruthy();
  });
});
