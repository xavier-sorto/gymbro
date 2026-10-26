// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { shareOrDownload } from '../../src/ui/data/shareFile';

const file = new File(['{}'], 'gymbro-backup-2026-10-26.json', { type: 'application/json' });

function stubNavigator(canShare: boolean, share: () => Promise<void>) {
  vi.stubGlobal('navigator', { canShare: () => canShare, share });
}

function stubDownload() {
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
}

describe('shareOrDownload', () => {
  it('shares the file when the phone can share files', async () => {
    const share = vi.fn(async () => undefined);
    stubNavigator(true, share);
    const click = stubDownload();
    expect(await shareOrDownload(file)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [file] });
    expect(click).not.toHaveBeenCalled();
  });

  it('downloads when sharing files is not supported', async () => {
    stubNavigator(false, vi.fn());
    const click = stubDownload();
    expect(await shareOrDownload(file)).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
  });

  it('does nothing when the share sheet is cancelled', async () => {
    stubNavigator(true, async () => Promise.reject(new DOMException('cancelled', 'AbortError')));
    const click = stubDownload();
    expect(await shareOrDownload(file)).toBe('cancelled');
    expect(click).not.toHaveBeenCalled();
  });

  it('falls back to one download and logs when sharing fails', async () => {
    stubNavigator(true, async () => Promise.reject(new Error('boom')));
    const click = stubDownload();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await shareOrDownload(file)).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalled();
  });

  it('throws when the download fallback fails too', async () => {
    stubNavigator(false, vi.fn());
    stubDownload();
    URL.createObjectURL = vi.fn(() => {
      throw new Error('no blob urls');
    });
    await expect(shareOrDownload(file)).rejects.toThrow('no blob urls');
  });
});
