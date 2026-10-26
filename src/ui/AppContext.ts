import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Workout } from '../store';

export interface AppContextValue {
  /** The workout in progress, or null. */
  active: Workout | null;
  /** Re-reads the active workout from the store. */
  refreshActive: () => Promise<void>;
  /** "Saved: Push, 12 sets" after finishing; shown once on home. */
  notice: string | null;
  setNotice: (notice: string | null) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <App>');
  return value;
}

export function useActiveWorkout(): Workout {
  const { active } = useApp();
  if (!active) throw new Error('This screen needs an active workout');
  return active;
}
