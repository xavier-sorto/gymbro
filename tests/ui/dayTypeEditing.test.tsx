// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { getDayType, openStore } from '../../src/store';
import { fireEvent, renderApp, screen, waitFor, SEED_PUSH, SEED_BENCH } from './helpers';

async function openPushTemplate() {
  await openStore();
  renderApp();
  fireEvent.click(await screen.findByText('Edit day types'));
  fireEvent.click(await screen.findByRole('button', { name: 'Push' }));
  await screen.findByLabelText('Remove Dumbbell Bench Press');
}

describe('day type template editing', () => {
  it('reorders, removes and keeps main lifts consistent', async () => {
    await openPushTemplate();
    const before = (await getDayType(SEED_PUSH)).exerciseIds;
    fireEvent.click(screen.getByLabelText('Move Dumbbell Bench Press down'));
    await waitFor(async () => expect((await getDayType(SEED_PUSH)).exerciseIds.slice(0, 2)).toEqual([before[1], before[0]]));

    fireEvent.click(await screen.findByLabelText('Remove Dumbbell Bench Press'));
    await waitFor(async () => {
      const day = await getDayType(SEED_PUSH);
      expect(day.exerciseIds).toHaveLength(5);
      expect(day.mainLiftIds).toEqual([]);
    });
  });

  it('stars a main lift', async () => {
    await openPushTemplate();
    fireEvent.click(screen.getByLabelText('Overhead Press main lift'));
    await waitFor(async () => expect((await getDayType(SEED_PUSH)).mainLiftIds).toContain('seed-ex-overhead-press'));
    expect((await getDayType(SEED_PUSH)).mainLiftIds).toContain(SEED_BENCH);
  });

  it('adds a library exercise and a typed new exercise, and starting the day uses them', async () => {
    await openPushTemplate();
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    fireEvent.input(await screen.findByLabelText('Search exercises'), { target: { value: 'Plank' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Plank' }));
    await waitFor(async () => expect((await getDayType(SEED_PUSH)).exerciseIds).toHaveLength(7));

    fireEvent.click(await screen.findByRole('button', { name: 'Add exercise' }));
    fireEvent.input(await screen.findByLabelText('Search exercises'), { target: { value: 'Zottman Curl' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Create "Zottman Curl"' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create' }));
    await waitFor(async () => expect((await getDayType(SEED_PUSH)).exerciseIds).toHaveLength(8));

    window.location.hash = '#/';
    fireEvent.click(await screen.findByRole('button', { name: 'Push' }));
    await screen.findByText('Zottman Curl');
    expect(document.querySelectorAll('.card')).toHaveLength(8);
  });

  it('renames a day type', async () => {
    await openPushTemplate();
    const input = screen.getByLabelText('Day type name') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'Push day' } });
    fireEvent.change(input, { target: { value: input.value } });
    await waitFor(async () => expect((await getDayType(SEED_PUSH)).name).toBe('Push day'));
  });

  it('shows the validation message and keeps the stored list when a rename is rejected', async () => {
    await openPushTemplate();
    const input = screen.getByLabelText('Day type name') as HTMLInputElement;
    fireEvent.input(input, { target: { value: '   ' } });
    fireEvent.change(input, { target: { value: input.value } });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect((await getDayType(SEED_PUSH)).name).toBe('Push');
  });
});
