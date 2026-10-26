// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/preact';
import { App } from '../../src/ui/App';
import { REST_STORAGE_KEY, resetRestTimerMemory } from '../../src/ui/rest/restTimer';
import { fireEvent, renderInActivePush, screen, waitFor } from './helpers';

async function saveOneSet() {
  const view = await renderInActivePush();
  fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
  fireEvent.click(await screen.findByRole('button', { name: 'Save set' }));
  await screen.findByRole('timer');
  return view;
}

describe('rest timer', () => {
  it('counts down after save, +30 s adds time, Skip hides it', async () => {
    await saveOneSet();
    expect(screen.getByRole('timer').textContent).toMatch(/1:(30|29)/);
    fireEvent.click(screen.getByRole('button', { name: '+30 s' }));
    await waitFor(() => expect(screen.getByRole('timer').textContent).toMatch(/2:(00|59)/));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('timer')).toBeNull();
    expect(window.sessionStorage.getItem(REST_STORAGE_KEY)).toBeNull();
  });

  it('shows done and then hides when the clock moves forward', async () => {
    await saveOneSet();
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() });
    try {
      vi.setSystemTime(Date.now() + 2 * 60 * 1000);
      expect(await screen.findByText('Rest done')).toBeTruthy();
      await new Promise((resolve) => setTimeout(resolve, 400)); // let the flash start
      vi.setSystemTime(Date.now() + 4000);
      await waitFor(() => expect(screen.queryByRole('timer')).toBeNull(), { timeout: 3000 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the remaining time across a reload', async () => {
    const view = await saveOneSet();
    expect(window.sessionStorage.getItem(REST_STORAGE_KEY)).toContain('endsAt');
    view.unmount();
    resetRestTimerMemory();
    render(<App />);
    expect((await screen.findByRole('timer')).textContent).toMatch(/1:(30|29|28)/);
  });
});
