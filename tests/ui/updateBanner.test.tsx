// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { UPDATE_READY_EVENT } from '../../src/pwa/registerServiceWorker';
import { UpdateBanner } from '../../src/ui/components/UpdateBanner';

describe('UpdateBanner', () => {
  it('is hidden until an update is waiting, then applies it with a reload', async () => {
    const apply = vi.fn(async () => {});
    render(<UpdateBanner />);
    expect(screen.queryByRole('button')).toBeNull();
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT, { detail: apply }));
    });
    fireEvent.click(await screen.findByRole('button', { name: /new version ready/i }));
    expect(apply).toHaveBeenCalledWith(true);
  });
});
