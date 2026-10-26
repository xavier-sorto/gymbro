// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { openStore } from '../../src/store';
import { fireEvent, renderApp, renderInActivePush, screen, waitFor } from './helpers';

describe('start and resume', () => {
  it('starts Push with 6 cards and a star on Dumbbell Bench Press', async () => {
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Push' }));
    expect(await screen.findByText('Dumbbell Bench Press')).toBeTruthy();
    expect(document.querySelectorAll('.card')).toHaveLength(6);
    expect(screen.getByLabelText('main lift')).toBeTruthy();
    expect(window.location.hash).toBe('#/workout');
  });

  it('lists the five day types and Empty workout on home', async () => {
    renderApp();
    for (const name of ['Push', 'Pull', 'Legs', 'Chest & Back', 'Shoulders & Arms', 'Empty workout']) {
      expect(await screen.findByRole('button', { name })).toBeTruthy();
    }
  });

  it('lands back in the workout after a reload, and home shows Resume Push', async () => {
    const view = await renderInActivePush();
    await screen.findByText('Dumbbell Bench Press');
    expect(window.location.hash).toBe('#/workout');
    fireEvent.click(screen.getByText('Workout', { selector: 'a' }));
    expect(await screen.findByRole('button', { name: /Resume Push \(started/ })).toBeTruthy();
    view.unmount();
  });

  it('redirects home from an exercise of a missing workout, with no message', async () => {
    await openStore();
    window.location.hash = '#/workout/ex/gone';
    renderApp();
    await waitFor(() => expect(window.location.hash).toBe('#/'));
    expect(document.querySelector('[role=alert]')).toBeNull();
  });

  it('shows the full-screen message when the store is unavailable', async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;
    try {
      renderApp();
      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(screen.getByText(/can't save data here/)).toBeTruthy();
    } finally {
      globalThis.indexedDB = original;
    }
  });
});
