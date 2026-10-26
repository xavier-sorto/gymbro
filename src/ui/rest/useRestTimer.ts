import { useEffect, useState } from 'preact/hooks';
import { playBeep } from './beep';
import { getRestTimer, skipRest, subscribeRest, type RestTimerState } from './restTimer';

const TICK_MS = 250;
export const FLASH_MS = 3000;

export interface RestView {
  timer: RestTimerState;
  remainingSeconds: number;
  /** True for 3 s after the countdown reaches zero. */
  done: boolean;
}

/** The running rest timer, recomputed from its end time every 250 ms; null when none is showing. */
export function useRestTimer(): RestView | null {
  const [timer, setTimer] = useState(getRestTimer);
  const [now, setNow] = useState(() => Date.now());
  const [doneAt, setDoneAt] = useState<number | null>(null);

  useEffect(() => subscribeRest(() => {
    setTimer(getRestTimer());
    setDoneAt(null);
    setNow(Date.now());
  }), []);

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [timer]);

  const remainingMs = timer ? timer.endsAt - now : 0;
  const finished = timer !== null && remainingMs <= 0;

  useEffect(() => {
    if (!finished) return;
    playBeep();
    setDoneAt(Date.now());
  }, [finished, timer]);

  useEffect(() => {
    if (doneAt === null) return;
    if (now - doneAt >= FLASH_MS) skipRest();
  }, [doneAt, now]);

  if (!timer) return null;
  return { timer, remainingSeconds: Math.max(0, remainingMs / 1000), done: finished };
}
