import { Icon } from '../components/Icon';
import { formatDuration, pluralSets } from '../format';
import { historyHash } from '../router';
import type { HistoryRowData } from './historyData';

/** With onDelete the row is not a link: it shows a Delete button instead. */
export function HistoryRow({ row, onDelete }: { row: HistoryRowData; onDelete?: () => void }) {
  const { workout } = row;
  const started = new Date(workout.startedAt);
  const duration = formatDuration((workout.finishedAt ?? workout.startedAt) - workout.startedAt);
  const body = (
    <>
      <div class="history-date">
        <div class="history-weekday">{started.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        <div class="history-day">{started.getDate()}</div>
      </div>
      <div class="history-text">
        <div class="history-title">{row.title}</div>
        <div class="history-sub">
          {duration} · {pluralSets(row.workingSets)}
        </div>
        <div class="history-sub history-exercises">{row.exerciseNames.slice(0, 3).join(', ')}</div>
      </div>
    </>
  );
  return onDelete ? (
    <div class="history-row">
      {body}
      <button type="button" class="history-delete" aria-label={`Delete ${row.title} workout`} onClick={onDelete}>
        Delete
      </button>
    </div>
  ) : (
    <a class="history-row" href={historyHash(workout.id)}>
      {body}
      <Icon name="chevronRight" />
    </a>
  );
}
