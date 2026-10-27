import { useEffect, useState } from 'preact/hooks';
import { ErrorNotice } from '../components/ErrorNotice';
import { reportError } from '../errors';
import { HistoryRow } from './HistoryRow';
import { loadHistoryPage, type HistoryRowData } from './historyData';

const monthOf = (row: HistoryRowData) =>
  new Date(row.workout.startedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function HistoryScreen() {
  const [rows, setRows] = useState<HistoryRowData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  let previousMonth = '';
  return (
    <main class="screen">
      <header class="top">
        <h1 class="h1">History</h1>
      </header>
      {error && <ErrorNotice message={error} onRetry={loadMore} />}
      {loaded && rows.length === 0 && <p class="hint">No workouts yet: start one from Workout.</p>}
      {rows.map((row) => {
        const month = monthOf(row);
        const heading = month === previousMonth ? null : <h2 class="history-month">{month}</h2>;
        previousMonth = month;
        return (
          <div key={row.workout.id}>
            {heading}
            <HistoryRow row={row} />
          </div>
        );
      })}
      {hasMore && (
        <button type="button" class="big-button secondary" disabled={loading} onClick={loadMore}>
          Load more
        </button>
      )}
    </main>
  );
}
