export type RegisterSw = (options: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (url: string, registration?: { update: () => Promise<unknown> }) => void;
  onRegisterError?: (error: unknown) => void;
}) => (reloadPage?: boolean) => Promise<void>;

export const UPDATE_READY_EVENT = 'gymbro:update-ready';

/**
 * Registers the offline-cache service worker. Failure (for example a private tab) is logged
 * and the app keeps working online. A waiting update is announced with UPDATE_READY_EVENT,
 * whose detail is the function that activates it and reloads (also the return value).
 */
export function registerServiceWorker(register: RegisterSw, target: EventTarget = window) {
  let update: (reloadPage?: boolean) => Promise<void> = async () => {};
  update = register({
    onNeedRefresh: () => target.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT, { detail: update })),
    // An installed iPhone app stays alive for days, so check for a new version whenever it returns to view.
    onRegisteredSW: (_url, registration) =>
      target.addEventListener('visibilitychange', () => void registration?.update().catch(() => {})),
    onOfflineReady: () => console.info('GymBro is cached and ready to open offline'),
    onRegisterError: (error) =>
      console.error('GymBro could not set up offline use; it still works while online', error),
  });
  return update;
}
