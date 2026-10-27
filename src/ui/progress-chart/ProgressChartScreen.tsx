import { useState } from 'preact/hooks';
import { getExercise, getExerciseHistory } from '../../store';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { formatShortDate, formatSets } from '../format';
import { useLoad } from '../useLoad';
import { buildProgressView, type RangeKey } from './chartValues';
import { LEGEND, formatBest } from './kindLabels';
import { ProgressChartSvg } from './ProgressChartSvg';

/** Sessions the chart can show at most; one more is fetched to know whether there were extra. */
export const MAX_SESSIONS = 500;

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '3m', label: '3 months' },
  { key: '1y', label: '1 year' },
  { key: 'all', label: 'All' },
];

async function loadProgress(exerciseId: string) {
  const [exercise, fetched] = await Promise.all([
    getExercise(exerciseId),
    getExerciseHistory(exerciseId, { sessions: MAX_SESSIONS + 1 }),
  ]);
  return { exercise, history: fetched.slice(0, MAX_SESSIONS), hasMore: fetched.length > MAX_SESSIONS };
}

export function ProgressChartScreen({ exerciseId }: { exerciseId: string }) {
  const [range, setRange] = useState<RangeKey>('3m');
  const loaded = useLoad(
    `loading progress for ${exerciseId}`,
    "Couldn't load this exercise's progress. Check that the exercise still exists, then try again.",
    () => loadProgress(exerciseId),
    [exerciseId],
  );
  const { data } = loaded;
  const view = data && buildProgressView(data.history, data.exercise.kind, range, Date.now());
  const kind = data?.exercise.kind;

  return (
    <main class="screen">
      <BackLink to="#/history" label="Back" />
      <p class="eyebrow">Progress</p>
      <h1 class="h1 progress-title">{data?.exercise.name ?? ''}</h1>
      {loaded.error && <ErrorNotice message={loaded.error} onRetry={loaded.reload} />}
      {data && view && kind && (
        <>
          <div class="segmented" role="group" aria-label="Range">
            {RANGES.map((option) => (
              <button key={option.key} type="button" aria-pressed={range === option.key} onClick={() => setRange(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
          {range === 'all' && data.hasMore && <p class="hint">Showing the last {MAX_SESSIONS} sessions</p>}
          {view.points.length === 0 ? (
            <p class="hint">{data.history.length === 0 ? 'No sessions yet' : 'No sessions in this range'}</p>
          ) : (
            <div class="chart-box">
              <ProgressChartSvg points={view.points} label={`${data.exercise.name} progress chart`} />
              <div class="chart-legend">
                <span><i class="chart-swatch chart-weight" />{LEGEND[kind].line}</span>
                {LEGEND[kind].bars && <span><i class="chart-swatch chart-bar" />{LEGEND[kind].bars}</span>}
              </div>
            </div>
          )}
          {view.best && (
            <div class="stat stat-today best-so-far">
              <div>
                <div class="stat-key">Best so far</div>
                <div class="best-value">{formatBest(kind, view.best)}</div>
              </div>
              <span class="tag">{formatShortDate(view.best.startedAt)}</span>
            </div>
          )}
          {view.sessions.length > 0 && (
            <>
              <h2 class="section-label">Sessions</h2>
              {view.sessions.map((session) => (
                <div class="session-row" key={session.startedAt}>
                  <span class="session-date">{formatShortDate(session.startedAt)}</span>
                  <span class="session-sets">{formatSets(kind, session.workingSets)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </main>
  );
}
