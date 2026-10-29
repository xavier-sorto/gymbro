// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openStore } from '../../src/store';
import { renderApp, screen, waitFor } from './helpers';

afterEach(() => vi.restoreAllMocks());

describe('moving between screens', () => {
  it('starts each screen at the top instead of inheriting the last screen\'s scroll', async () => {
    await openStore();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.location.hash = '#/library';
    renderApp();
    await screen.findByText('Library', { selector: 'h1' });
    scrollTo.mockClear();

    window.location.hash = '#/history';
    await screen.findByText('History', { selector: 'h1' });
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));

    scrollTo.mockClear();
    window.location.hash = '#/volume';
    await screen.findByText('Weekly volume');
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));
  });

  it('does not scroll when nothing navigated', async () => {
    await openStore();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.location.hash = '#/settings';
    renderApp();
    await screen.findByText('Settings', { selector: 'h1' });
    scrollTo.mockClear();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
