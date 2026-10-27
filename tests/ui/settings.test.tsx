// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addWorkoutExercise, finishWorkout, openStore, saveSet, startWorkout } from '../../src/store';
import { getDb } from '../../src/store/db';
import { setMeta } from '../../src/store/meta';
import { weekStart } from '../../src/ui/history/historyStats';
import {
  DEFAULT_SETTINGS,
  getSettings,
  loadSettings,
  sanitizeSettings,
  updateSettings,
} from '../../src/ui/settings/settings';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor, within, SEED_BENCH } from './helpers';

afterEach(async () => {
  document.documentElement.removeAttribute('data-theme');
  vi.unstubAllGlobals();
  await updateSettings(DEFAULT_SETTINGS).catch(() => {});
});

describe('sanitizeSettings', () => {
  it('gives the defaults for nothing, and for anything unusable', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ theme: 'neon', barLb: 'heavy', weekStartsOn: 'friday', volumeTargets: 9, warmupSuggestions: 'yes', backupReminderDays: 7 })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and rounds the bar to half a pound within 10 to 100', () => {
    expect(sanitizeSettings({ theme: 'light', barLb: 35.3, weekStartsOn: 'sunday', volumeTargets: 'higher', warmupSuggestions: false, backupReminderDays: 0 })).toEqual({
      theme: 'light',
      barLb: 35.5,
      weekStartsOn: 'sunday',
      volumeTargets: 'higher',
      warmupSuggestions: false,
      backupReminderDays: 0,
    });
    expect(sanitizeSettings({ barLb: 5 }).barLb).toBe(45);
    expect(sanitizeSettings({ barLb: 500 }).barLb).toBe(45);
  });
});

describe('saving and applying settings', () => {
  it('starts from the defaults, saves a change, and reads it back after a reload', async () => {
    await openStore();
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    await updateSettings({ weekStartsOn: 'sunday', barLb: 35 });
    expect((await getDb().meta.get('settings'))?.value).toMatchObject({ weekStartsOn: 'sunday', barLb: 35 });
    await updateSettings({ theme: 'light' });
    expect(await loadSettings()).toMatchObject({ weekStartsOn: 'sunday', barLb: 35, theme: 'light' });
  });

  it('keeps every change when several are made at once', async () => {
    await openStore();
    await Promise.all([updateSettings({ theme: 'light' }), updateSettings({ weekStartsOn: 'sunday' }), updateSettings({ barLb: 35 })]);
    const expected = { theme: 'light', weekStartsOn: 'sunday', barLb: 35 };
    expect(getSettings()).toMatchObject(expected);
    expect((await getDb().meta.get('settings'))?.value).toMatchObject(expected);
    expect(await loadSettings()).toMatchObject(expected);
  });

  it('puts the old settings back when saving fails', async () => {
    await openStore();
    const failing = vi.spyOn(getDb().meta, 'put').mockRejectedValueOnce(new Error('disk full'));
    await expect(updateSettings({ theme: 'light' })).rejects.toThrow('disk full');
    expect(getSettings().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    failing.mockRestore();
  });

  it('uses the defaults when what was stored is damaged', async () => {
    await openStore();
    await setMeta('settings', { theme: 'neon', barLb: -3 });
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('puts the theme on the page, and follows the phone for "match phone"', async () => {
    await openStore();
    await updateSettings({ theme: 'light' });
    expect(document.documentElement.dataset.theme).toBe('light');
    await updateSettings({ theme: 'dark' });
    expect(document.documentElement.dataset.theme).toBe('dark');
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {} }));
    await updateSettings({ theme: 'system' });
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('moves the start of the week between Monday and Sunday', async () => {
    await openStore();
    const wednesday = new Date(2026, 9, 28, 12).getTime();
    await updateSettings({ weekStartsOn: 'monday' });
    expect(weekStart(wednesday)).toBe(new Date(2026, 9, 26).getTime());
    await updateSettings({ weekStartsOn: 'sunday' });
    expect(weekStart(wednesday)).toBe(new Date(2026, 9, 25).getTime());
    expect(weekStart(new Date(2026, 9, 25, 9).getTime())).toBe(new Date(2026, 9, 25).getTime());
  });
});

describe('settings screen', () => {
  async function openSettings() {
    await openStore();
    window.location.hash = '#/settings';
    renderApp();
    await screen.findByText('Settings', { selector: 'h1' });
  }

  it('saves each choice as soon as it is picked', async () => {
    await openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    await waitFor(() => expect(getSettings().theme).toBe('light'));
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Sunday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Higher' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Warm-up suggestions' })).getByRole('button', { name: 'Off' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Backup reminder' })).getByRole('button', { name: '2 weeks' }));
    await waitFor(() =>
      expect(getSettings()).toMatchObject({ weekStartsOn: 'sunday', volumeTargets: 'higher', warmupSuggestions: false, backupReminderDays: 14 }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe('true'));
    await waitFor(() => expect(screen.getByRole('button', { name: '2 weeks' }).getAttribute('aria-pressed')).toBe('true'));
    expect((await getDb().meta.get('settings'))?.value).toMatchObject({ theme: 'light', weekStartsOn: 'sunday' });
  });

  it('keeps a bar weight that is out of range from being saved while typing', async () => {
    await openSettings();
    const field = screen.getByLabelText('Plate calculator bar (lb)');
    fireEvent.input(field, { target: { value: '35' } });
    await waitFor(() => expect(getSettings().barLb).toBe(35));
    fireEvent.input(field, { target: { value: '3' } });
    fireEvent.input(field, { target: { value: '' } });
    expect(getSettings().barLb).toBe(35);
  });

  it('is applied at startup from what was saved', async () => {
    await openStore();
    await setMeta('settings', { theme: 'light', barLb: 35 });
    window.location.hash = '#/plates';
    renderApp();
    await screen.findByText('Plate calculator');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect((screen.getByLabelText('Bar weight (lb)') as HTMLInputElement).value).toBe('35');
  });
});

describe('settings change what the rest of the app shows', () => {
  it('scales the weekly volume targets', async () => {
    await openStore();
    await updateSettings({ volumeTargets: 'higher' });
    window.location.hash = '#/volume';
    renderApp();
    const chest = (await screen.findByText('Chest', { selector: '.volume-name' })).closest('.volume-row') as HTMLElement;
    expect(chest.textContent).toContain('Target 15 to 25');
  });

  it('turns warm-up suggestions off everywhere', async () => {
    await openStore();
    const workout = await startWorkout(null);
    const entry = await addWorkoutExercise(workout.id, SEED_BENCH);
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, weightLb: 100, reps: 8 });
    await finishWorkout(workout.id);
    await updateSettings({ warmupSuggestions: false });
    await renderInActivePush();
    fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
    await screen.findByLabelText('Weight');
    expect(screen.queryByText(/^Warm-up:/)).toBeNull();
    expect((screen.getByLabelText('Warm-up') as HTMLInputElement).checked).toBe(false);
  });
});
