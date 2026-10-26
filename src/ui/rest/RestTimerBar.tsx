import { useRef } from 'preact/hooks';
import { ProgressBar } from '../components/ProgressBar';
import { formatCountdown } from '../format';
import { fractionOf } from '../progress';
import { ADD_REST_SECONDS, addRest, skipRest } from './restTimer';
import { useRestTimer } from './useRestTimer';

export function RestTimerBar() {
  const view = useRestTimer();
  // The longest remaining time seen this session stands in for the rest's full length (nothing extra is stored).
  const longestSeconds = useRef(0);
  if (!view) {
    longestSeconds.current = 0;
    return null;
  }
  longestSeconds.current = Math.max(longestSeconds.current, view.remainingSeconds);
  return (
    <div class={`rest-bar${view.done ? ' rest-bar-done' : ''}`} role="timer" aria-label="Rest timer">
      <div class="rest-bar-clock">
        <span class="rest-bar-label">Rest</span>
        <span class="rest-bar-time">{view.done ? 'Rest done' : formatCountdown(view.remainingSeconds)}</span>
        <ProgressBar label="Rest remaining" fraction={fractionOf(view.remainingSeconds, longestSeconds.current)} />
      </div>
      <div class="rest-bar-actions">
        <button type="button" class="rest-add" onClick={() => addRest(ADD_REST_SECONDS)}>
          +{ADD_REST_SECONDS} s
        </button>
        <button type="button" class="rest-skip" onClick={skipRest}>
          Skip
        </button>
      </div>
    </div>
  );
}
