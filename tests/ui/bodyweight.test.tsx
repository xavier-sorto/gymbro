// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { addBodyweight, listBodyweights, openStore } from '../../src/store';
import type { Bodyweight } from '../../src/store';
import { changeOverThirtyDays } from '../../src/ui/bodyweight/bodyweightStats';
import { fireEvent, renderApp, screen, waitFor, within } from './helpers';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const entry = (daysAgo: number, weightLb: number): Bodyweight => ({
  id: `b${daysAgo}`,
  updatedAt: 0,
  deleted: false,
  measuredAt: NOW - daysAgo * DAY,
  weightLb,
});

describe('changeOverThirtyDays', () => {
  it('is null with no weigh-ins or nothing earlier to compare with', () => {
    expect(changeOverThirtyDays([], NOW)).toBeNull();
    expect(changeOverThirtyDays([entry(0, 180)], NOW)).toBeNull();
    expect(changeOverThirtyDays([entry(0, 180), entry(45, 190)], NOW)).toBeNull();
  });

  it('compares the newest with the oldest weigh-in in the last 30 days', () => {
    expect(changeOverThirtyDays([entry(0, 178.5), entry(10, 180), entry(28, 181), entry(45, 190)], NOW)).toBe(-2.5);
    expect(changeOverThirtyDays([entry(0, 182), entry(7, 180)], NOW)).toBe(2);
  });
});

describe('bodyweight screen', () => {
  it('adds a weigh-in, starting the field at the last one, and shows the change', async () => {
    await openStore();
    await addBodyweight({ weightLb: 180, measuredAt: Date.now() - 10 * DAY });
    window.location.hash = '#/bodyweight';
    renderApp();
    await screen.findByText('Latest');
    expect((screen.getByLabelText('Weight (lb)') as HTMLInputElement).value).toBe('180');
    fireEvent.click(screen.getByLabelText('Weight (lb) minus'));
    fireEvent.click(screen.getByRole('button', { name: 'Add weigh-in' }));
    await waitFor(async () => expect((await listBodyweights()).map((e) => e.weightLb)).toEqual([179.5, 180]));
    expect(await screen.findByText('-0.5 lb')).toBeTruthy();
  });

  it('refuses an impossible weight and says why', async () => {
    await openStore();
    window.location.hash = '#/bodyweight';
    renderApp();
    await screen.findByText('Your weigh-ins will show up here.');
    fireEvent.input(screen.getByLabelText('Weight (lb)'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add weigh-in' }));
    expect(await screen.findByText('Weight must be between 20 and 1500 lb')).toBeTruthy();
    expect(await listBodyweights()).toEqual([]);
  });

  it('deletes a weigh-in after confirming', async () => {
    await openStore();
    await addBodyweight({ weightLb: 180 });
    window.location.hash = '#/bodyweight';
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete 180 lb weigh-in' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this weigh-in?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete weigh-in' }));
    await waitFor(async () => expect(await listBodyweights()).toEqual([]));
  });
});
