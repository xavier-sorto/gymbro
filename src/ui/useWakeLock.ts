import { useEffect } from 'preact/hooks';

/** Keeps the screen on while `enabled`; re-requests it when the app becomes visible again. Unsupported or refused: nothing happens. */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (stopped) await lock.release();
        else sentinel = lock;
      } catch (error) {
        console.warn('GymBro: the screen wake lock was refused', error);
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', request);
      sentinel?.release().catch((error: unknown) => console.warn('GymBro: releasing the wake lock failed', error));
    };
  }, [enabled]);
}
