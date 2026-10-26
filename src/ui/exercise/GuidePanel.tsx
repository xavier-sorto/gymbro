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
  const { last, best, target } = guide;
  return (
    <section class="guide">
      {last && (
        <p>
          Last time: {formatSets(kind, last.workingSets)} ({formatShortDate(last.startedAt)})
        </p>
      )}
      {best && <p>Best: {formatSet(kind, { weightLb: best.weightLb ?? null, reps: best.reps ?? null, seconds: best.seconds ?? null })}</p>}
      {target && (
        <p>
          Today: {formatSets(kind, target.sets)}
          {target.note && ` — ${target.note}`}
        </p>
      )}
    </section>
  );
}
