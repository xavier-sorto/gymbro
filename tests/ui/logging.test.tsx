// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { fireEvent, renderInActivePush, screen, waitFor, activeSets, SEED_BENCH } from './helpers';
import { failPuts } from '../store/helpers';

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.input(field(label), { target: { value } });
const saveButton = () => screen.getByRole('button', { name: /Save set|Retry/ });

async function openBench() {
  await renderInActivePush();
  fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
  await screen.findByLabelText('Weight');
}

describe('logging sets', () => {
  it('saves a set with one tap, prefills the next and starts the 90 s rest timer', async () => {
    await openBench();
    type('Weight', '65');
    type('Reps', '7');
    fireEvent.click(saveButton());
    await waitFor(async () => expect((await activeSets(SEED_BENCH)).map((s) => [s.weightLb, s.reps])).toEqual([[65, 7]]));
    await waitFor(() => expect(field('Weight').value).toBe('65'));
    expect(field('Reps').value).toBe('7');
    expect(screen.getByRole('timer').textContent).toMatch(/1:(30|29)/);
    // the second set is the one-tap case: the prefilled row saves as is
    fireEvent.click(saveButton());
    await waitFor(async () => expect(await activeSets(SEED_BENCH)).toHaveLength(2));
  });

  it('steps weight by weightStepLb and reps by 1, never below 0', async () => {
    await openBench();
    type('Weight', '60');
    fireEvent.click(screen.getByLabelText('Weight plus'));
    expect(field('Weight').value).toBe('65');
    type('Reps', '1');
    fireEvent.click(screen.getByLabelText('Reps minus'));
    fireEvent.click(screen.getByLabelText('Reps minus'));
    expect(field('Reps').value).toBe('0');
  });

  it('shows no weight field for bodyweight', async () => {
    await renderInActivePush();
    fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
    window.location.hash = '#/workout';
    window.location.hash = '#/workout/add';
    fireEvent.input(await screen.findByLabelText('Search exercises'), { target: { value: 'Dips' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Dips' }));
    fireEvent.click(await screen.findByText('Dips', { selector: '.card-title' }));
    await screen.findByLabelText('Reps');
    expect(screen.queryByLabelText('Weight')).toBeNull();
  });

  it('shows seconds stepping by 5 for a timed exercise', async () => {
    await renderInActivePush();
    window.location.hash = '#/workout/add';
    fireEvent.input(await screen.findByLabelText('Search exercises'), { target: { value: 'Plank' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Plank' }));
    fireEvent.click(await screen.findByText('Plank', { selector: '.card-title' }));
    await screen.findByLabelText('Seconds');
    const before = Number(field('Seconds').value);
    fireEvent.click(screen.getByLabelText('Seconds plus'));
    expect(Number(field('Seconds').value)).toBe(before + 5);
    expect(screen.queryByLabelText('Weight')).toBeNull();
  });

  it('edits and deletes a logged set', async () => {
    await openBench();
    type('Weight', '65');
    type('Reps', '8');
    fireEvent.click(saveButton());
    fireEvent.click(await screen.findByRole('button', { name: '65 × 8' }));
    const sheet = await screen.findByRole('dialog');
    const reps = sheet.querySelector('input[aria-label=Reps]') as HTMLInputElement;
    fireEvent.input(reps, { target: { value: '6' } });
    fireEvent.click(sheet.querySelector('.primary-button')!);
    fireEvent.click(await screen.findByRole('button', { name: '65 × 6' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete set' }));
    await waitFor(async () => expect(await activeSets(SEED_BENCH)).toHaveLength(0));
  });

  it('keeps the values, shows Not saved and starts no timer when storage is full; Retry saves', async () => {
    await openBench();
    type('Weight', '65');
    type('Reps', '7');
    const spy = failPuts('sets', Object.assign(new Error('full'), { name: 'QuotaExceededError' }));
    fireEvent.click(saveButton());
    expect(await screen.findByText(/Not saved. Your phone is out of storage/)).toBeTruthy();
    expect(field('Reps').value).toBe('7');
    expect(screen.queryByRole('timer')).toBeNull();
    spy.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(async () => expect(await activeSets(SEED_BENCH)).toHaveLength(1));
  });

  it('shows a validation error under the field and keeps Save enabled', async () => {
    await openBench();
    type('Reps', '101');
    fireEvent.click(saveButton());
    expect(await screen.findByText(/whole number/)).toBeTruthy();
    type('Reps', '8');
    fireEvent.click(saveButton());
    await waitFor(async () => expect(await activeSets(SEED_BENCH)).toHaveLength(1));
  });

  it('shows a generic retry message for other save failures', async () => {
    await openBench();
    const spy = failPuts('sets', new Error('disk on fire'));
    fireEvent.click(saveButton());
    expect(await screen.findByText("Couldn't save. Tap to retry.")).toBeTruthy();
    spy.mockRestore();
  });
});
