import { Icon } from '../components/Icon';
import { formatDuration, pluralSets } from '../format';
import { historyHash } from '../router';
import type { HistoryRowData } from './historyData';

export function HistoryRow({ row }: { row: HistoryRowData }) {
  const { workout } = row;
  const started = new Date(workout.startedAt);
  const duration = formatDuration((workout.finishedAt ?? workout.startedAt) - workout.startedAt);
  return (
    <a class="history-row" href={historyHash(workout.id)}>
      <div class="history-date">
        <div class="history-weekday">{started.toLocaleDateString('en-US', { weekday: 'short' })}</div>
        <div class="history-day">{started.getDate()}</div>
      </div>
      <div class="history-text">
        <div class="history-title">{row.title}</div>
        <div class="history-sub">
          {duration} · {pluralSets(row.workingSets)}
        </div>
        <div class="history-sub history-exercises">{row.exerciseNames.join(', ')}</div>
      </div>
      <Icon name="chevronRight" />
    </a>
  );
}
