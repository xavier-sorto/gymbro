export type RegisterSw = (options: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisterError?: (error: unknown) => void;
}) => (reloadPage?: boolean) => Promise<void>;

export const UPDATE_READY_EVENT = 'gymbro:update-ready';

/**
 * Registers the offline-cache service worker. Failure (for example a private tab) is logged
 * and the app keeps working online. A waiting update is announced with UPDATE_READY_EVENT;
 * the returned function activates it and reloads.
 */
export function registerServiceWorker(register: RegisterSw, target: EventTarget = window) {
  return register({
    onNeedRefresh: () => target.dispatchEvent(new Event(UPDATE_READY_EVENT)),
    onOfflineReady: () => console.info('GymBro is cached and ready to open offline'),
    onRegisterError: (error) =>
      console.error('GymBro could not set up offline use; it still works while online', error),
  });
}
