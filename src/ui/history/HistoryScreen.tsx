import { useEffect, useState } from 'preact/hooks';
import { deleteWorkout } from '../../store';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { SearchField } from '../components/SearchField';
import { reportError } from '../errors';
import { useLoad } from '../useLoad';
import { HistoryRow } from './HistoryRow';
import { deleteWorkoutMessage, loadHistoryPage, loadHistoryStats, type HistoryRowData } from './historyData';

const monthOf = (row: HistoryRowData) =>
  new Date(row.workout.startedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function HistoryScreen() {
  const [rows, setRows] = useState<HistoryRowData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [dayType, setDayType] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<HistoryRowData | null>(null);
  const stats = useLoad('loading history stats', '', loadHistoryStats, []);

  const loadMore = async () => {
    setLoading(true);
    try {
      const page = await loadHistoryPage(rows[rows.length - 1]?.workout.startedAt);
      setRows((current) => [...current, ...page.rows]);
      setHasMore(page.hasMore);
      setLoaded(true);
      setError(null);
    } catch (failure) {
      setError(reportError('loading the workout history', failure, "Couldn't load your history."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMore();
  }, []);

  const removeWorkout = async (row: HistoryRowData) => {
    setDeleting(null);
    try {
      await deleteWorkout(row.workout.id);
      setRows((current) => current.filter((other) => other !== row));
      stats.reload();
    } catch (failure) {
      setError(reportError('deleting a workout', failure, "Couldn't delete the workout. Try again."));
    }
  };

  // shortcut: filters only cover the workouts loaded so far (50 per "Load more"), upgrade to a store query if history gets huge
  const typed = query.trim().toLowerCase();
  const dayTypes = [...new Set(rows.map((row) => row.title))];
  const shown = rows.filter(
    (row) =>
      (!dayType || row.title === dayType) &&
      (!typed || row.exerciseNames.some((name) => name.toLowerCase().includes(typed))),
  );

  let previousMonth = '';
  return (
    <main class="screen">
      <header class="top">
        <h1 class="h1">History</h1>
        {rows.length > 0 && (
          <button type="button" class="link-button" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </header>
      {error && <ErrorNotice message={error} onRetry={loadMore} />}
      {loaded && rows.length === 0 && <p class="hint">No workouts yet: start one from Workout.</p>}
      {stats.data && rows.length > 0 && (
        <div class="detail-stats history-stats">
          <div class="stat">
            <div class="stat-key">This week</div>
            <div class="detail-stat-value">{stats.data.weekWorkouts}</div>
          </div>
          <div class="stat">
            <div class="stat-key">Volume</div>
            <div class="detail-stat-value">{stats.data.weekVolumeLb.toLocaleString('en-US')} lb</div>
          </div>
          <div class="stat">
            <div class="stat-key">Streak</div>
            <div class="detail-stat-value">{stats.data.streakWeeks} {stats.data.streakWeeks === 1 ? 'wk' : 'wks'}</div>
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div class="history-filters">
          <SearchField value={query} onChange={setQuery} />
          {dayTypes.length > 1 && (
            <select aria-label="Day type" value={dayType} onChange={(event) => setDayType(event.currentTarget.value)}>
              <option value="">All day types</option>
              {dayTypes.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {rows.length > 0 && shown.length === 0 && <p class="hint">No workouts match.</p>}
      {shown.map((row) => {
        const month = monthOf(row);
        const heading = month === previousMonth ? null : <h2 class="history-month">{month}</h2>;
        previousMonth = month;
        return (
          <div key={row.workout.id}>
            {heading}
            <HistoryRow row={row} onDelete={editing ? () => setDeleting(row) : undefined} />
          </div>
        );
      })}
      {hasMore && (
        <button type="button" class="big-button secondary" disabled={loading} onClick={loadMore}>
          Load more
        </button>
      )}
      {deleting && (
        <ConfirmSheet
          title="Delete this workout?"
          message={deleteWorkoutMessage(deleting.title, deleting.workout.startedAt, deleting.totalSets)}
          confirmLabel="Delete workout"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => removeWorkout(deleting)}
        />
      )}
    </main>
  );
}
