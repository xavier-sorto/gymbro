export interface RestTimerState {
  /** Epoch milliseconds when the rest ends. */
  endsAt: number;
  workoutExerciseId: string;
}

export const REST_STORAGE_KEY = 'gymbro.restTimer';
export const ADD_REST_SECONDS = 30;

let state: RestTimerState | null | undefined;
const listeners = new Set<() => void>();

function readStored(): RestTimerState | null {
  try {
    const raw = window.sessionStorage.getItem(REST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RestTimerState>;
    if (typeof parsed.endsAt === 'number' && typeof parsed.workoutExerciseId === 'string') {
      return { endsAt: parsed.endsAt, workoutExerciseId: parsed.workoutExerciseId };
    }
    throw new Error('stored rest timer has the wrong shape');
  } catch (error) {
    console.warn('GymBro: ignoring an unreadable rest timer', error);
    clearStored();
    return null;
  }
}

function clearStored(): void {
  try {
    window.sessionStorage.removeItem(REST_STORAGE_KEY);
  } catch (error) {
    console.warn('GymBro: could not clear the saved rest timer', error);
  }
}

function setState(next: RestTimerState | null): void {
  state = next;
  try {
    if (next) window.sessionStorage.setItem(REST_STORAGE_KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(REST_STORAGE_KEY);
  } catch (error) {
    console.warn('GymBro: could not save the rest timer; it will not survive a reload', error);
  }
  listeners.forEach((listener) => listener());
}

export function getRestTimer(): RestTimerState | null {
  if (state === undefined) state = readStored();
  return state;
}

export function startRest(seconds: number, workoutExerciseId: string): void {
  setState({ endsAt: Date.now() + seconds * 1000, workoutExerciseId });
}

export function addRest(seconds: number): void {
  const current = getRestTimer();
  if (current) setState({ ...current, endsAt: Math.max(current.endsAt, Date.now()) + seconds * 1000 });
}

export function skipRest(): void {
  if (getRestTimer()) setState(null);
}

export function subscribeRest(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forgets the in-memory copy so the next read comes from sessionStorage (tests simulate a reload with this). */
export function resetRestTimerMemory(): void {
  state = undefined;
}
