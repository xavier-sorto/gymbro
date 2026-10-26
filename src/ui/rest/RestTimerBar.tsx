import { formatCountdown } from '../format';
import { ADD_REST_SECONDS, addRest, skipRest } from './restTimer';
import { useRestTimer } from './useRestTimer';

export function RestTimerBar() {
  const view = useRestTimer();
  if (!view) return null;
  return (
    <div class={`rest-bar${view.done ? ' rest-bar-done' : ''}`} role="timer" aria-label="Rest timer">
      <span class="rest-bar-time">{view.done ? 'Rest done' : formatCountdown(view.remainingSeconds)}</span>
      <button type="button" onClick={() => addRest(ADD_REST_SECONDS)}>
        +{ADD_REST_SECONDS} s
      </button>
      <button type="button" onClick={skipRest}>
        Skip
      </button>
    </div>
  );
}
