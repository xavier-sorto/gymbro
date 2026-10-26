// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderInActivePush, screen, waitFor, activeSets, SEED_BENCH } from './helpers';

const flags = vi.hoisted(() => ({ historyFails: false, guideFails: false }));

vi.mock('../../src/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/store')>();
  return {
    ...actual,
    getExerciseHistory: (...args: Parameters<typeof actual.getExerciseHistory>) =>
      flags.historyFails ? Promise.reject(new Error('history boom')) : actual.getExerciseHistory(...args),
  };
});
vi.mock('../../src/engine/guide', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/engine/guide')>();
  return {
    ...actual,
    getGuide: (...args: Parameters<typeof actual.getGuide>) => {
      if (flags.guideFails) throw new Error('guide boom');
      return actual.getGuide(...args);
    },
  };
});

async function openBench() {
  await renderInActivePush();
  fireEvent.click(await screen.findByText('Dumbbell Bench Press'));
}

describe('guide panel', () => {
  it("shows Couldn't load last time when history fails, and logging still works", async () => {
    flags.historyFails = true;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await openBench();
      expect(await screen.findByText("Couldn't load last time")).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Save set' }));
      await waitFor(async () => expect(await activeSets(SEED_BENCH)).toHaveLength(1));
    } finally {
      flags.historyFails = false;
    }
  });

  it('shows Suggestion unavailable when the guide throws, and logs it', async () => {
    flags.guideFails = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await openBench();
      expect(await screen.findByText('Suggestion unavailable')).toBeTruthy();
      expect(log).toHaveBeenCalled();
    } finally {
      flags.guideFails = false;
    }
  });

  it('shows the first-time message when there is no history', async () => {
    await openBench();
    expect(await screen.findByText('First time: pick a starting weight')).toBeTruthy();
  });
});
