/** Taps closer together than this count as a double tap, which iOS turns into a page zoom. */
export const DOUBLE_TAP_MS = 350;

/**
 * iOS zooms the page on a quick second tap even with touch-action set, notably in the installed app.
 * Cancelling that tap's touchend stops the zoom but also its click, so a tap on a button or link is
 * clicked here instead: pressing + twice quickly still adds twice.
 */
export function installDoubleTapGuard(target: Document = document, now: () => number = Date.now): () => void {
  let lastTouchEnd = 0;
  const onTouchEnd = (event: Event) => {
    const time = now();
    const isDoubleTap = time - lastTouchEnd <= DOUBLE_TAP_MS;
    lastTouchEnd = time;
    if (!isDoubleTap) return;
    const control = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a[href]') : null;
    if (!control) return;
    event.preventDefault();
    control.click();
  };
  target.addEventListener('touchend', onTouchEnd, { passive: false });
  return () => target.removeEventListener('touchend', onTouchEnd);
}
