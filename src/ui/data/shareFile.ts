export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Hands a file to the phone's share sheet; falls back to a download link when sharing
 * isn't available or fails once. Cancelling the share sheet is not a failure.
 * Throws only when the download fallback fails too.
 */
export async function shareOrDownload(file: File): Promise<ShareOutcome> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
      console.error('GymBro: sharing a file failed, downloading it instead', error);
    }
  }
  downloadFile(file);
  return 'downloaded';
}
