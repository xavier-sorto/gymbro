import type { Guide } from '../../engine';
import type { ExerciseKind } from '../../store';
import { formatSet, formatSets, formatShortDate } from '../format';
import type { GuideStatus } from './loadExercise';

interface GuidePanelProps {
  kind: ExerciseKind;
  guide: Guide;
  status: GuideStatus;
}

const STATUS_MESSAGES: Record<Exclude<GuideStatus, 'ok'>, string> = {
  'history-failed': "Couldn't load last time",
  unavailable: 'Suggestion unavailable',
};

export function GuidePanel({ kind, guide, status }: GuidePanelProps) {
  if (status !== 'ok') return <section class="guide"><p class="hint">{STATUS_MESSAGES[status]}</p></section>;
  if (guide.firstTime) {
    return (
      <section class="guide">
        <p>{kind === 'weighted' ? 'First time: pick a starting weight' : 'First time: pick a starting point'}</p>
      </section>
    );
  }
  const { last, best, target, warmups, stall } = guide;
  return (
    <>
    <section class="guide guide-stats">
      {last && (
        <div class="stat">
          <p class="stat-key">Last time</p>
          <p class="stat-value">{formatSets(kind, last.workingSets)}</p>
          <p class="stat-sub">{formatShortDate(last.startedAt)}</p>
        </div>
      )}
      {best && (
        <div class="stat">
          <p class="stat-key">Best</p>
          <p class="stat-value">{formatSet(kind, { weightLb: best.weightLb ?? null, reps: best.reps ?? null, seconds: best.seconds ?? null })}</p>
        </div>
      )}
      {target && (
        <div class="stat stat-today">
          <p class="stat-key">Today</p>
          <p class="stat-value">{formatSets(kind, target.sets)}</p>
          {target.note && <p class="stat-sub">{target.note}</p>}
        </div>
      )}
    </section>
    {warmups.length > 0 && <p class="guide-warmups">Warm-up: {formatSets(kind, warmups)}</p>}
    {stall && (
      <p class="stall-note">
        Stuck for {stall.stuckSessions} sessions. Try {formatSet(kind, stall.reset)} to reset.
      </p>
    )}
    </>
  );
}
