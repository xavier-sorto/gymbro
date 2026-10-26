import { useCallback, useEffect, useState } from 'preact/hooks';
import { reportError } from './errors';

export interface Loaded<T> {
  data: T | null;
  error: string | null;
  reload: () => void;
}

/** Runs an async loader on mount and when `deps` change; failures are logged and shown as `errorMessage`. */
export function useLoad<T>(what: string, errorMessage: string, load: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    load().then(
      (value) => {
        if (cancelled) return;
        setData(value);
        setError(null);
      },
      (failure: unknown) => {
        if (!cancelled) setError(reportError(what, failure, errorMessage));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [...deps, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}
