import { useEffect, useState } from 'preact/hooks';
import { UPDATE_READY_EVENT } from '../../pwa/registerServiceWorker';

type Apply = (reloadPage?: boolean) => Promise<void>;

/** Appears when a new version has been downloaded; tapping it switches to that version. */
export function UpdateBanner() {
  const [apply, setApply] = useState<Apply | null>(null);
  useEffect(() => {
    const onReady = (event: Event) => setApply(() => (event as CustomEvent<Apply>).detail);
    window.addEventListener(UPDATE_READY_EVENT, onReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onReady);
  }, []);
  if (!apply) return null;
  return (
    <button type="button" class="update-banner" onClick={() => void apply(true)}>
      New version ready. Tap to update
    </button>
  );
}
