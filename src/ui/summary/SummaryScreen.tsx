import { MUSCLE_LABELS } from '../../engine';
import { ErrorNotice } from '../components/ErrorNotice';
import { formatChange, formatDuration, formatSet, formatSets, formatTime, formatWeekdayDate } from '../format';
import { MISSING_WORKOUT, loadWorkoutSummary } from '../history/historyData';
import { historyHash, navigate } from '../router';
import { useLoad } from '../useLoad';

const sets = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const pounds = (value: number) => `${Math.round(value).toLocaleString('en-US')} lb`;

/** The screen after Finish: what the workout added up to, how it compares, and any records. */
export function SummaryScreen({ workoutId }: { workoutId: string }) {
  const loaded = useLoad('summarizing the finished workout', "Couldn't load the summary.", () => loadWorkoutSummary(workoutId), [workoutId]);
  const summary = loaded.data === MISSING_WORKOUT ? null : loaded.data;
  const { workout, title, exercises } = summary?.detail ?? {};
  const records = exercises?.filter((item) => item.isRecord) ?? [];
  const progressed = exercises?.filter((item) => !item.isRecord && item.change && item.change.value > 0) ?? [];
  const volumeChange = summary && summary.workingSets > 0 && summary.previous && summary.previous.volumeLb > 0 ? summary.volumeLb - summary.previous.volumeLb : null;

  return (
    <main class="screen">
      {loaded.error && <ErrorNotice message={loaded.error} onRetry={loaded.reload} />}
      {loaded.data === MISSING_WORKOUT && <p class="hint">This workout isn't finished or isn't in your history any more.</p>}
      {summary && workout && (
        <>
          <h1 class="h1">Workout saved</h1>
          <p class="hint summary-when">
            {title} · {formatWeekdayDate(workout.startedAt)} · {formatTime(workout.startedAt).toLowerCase()}
          </p>
          <div class="detail-stats">
            <div class="stat">
              <div class="stat-key">Time</div>
              <div class="detail-stat-value">{formatDuration((workout.finishedAt ?? workout.startedAt) - workout.startedAt)}</div>
            </div>
            <div class="stat">
              <div class="stat-key">Sets</div>
              <div class="detail-stat-value">{summary.workingSets}</div>
            </div>
            <div class="stat">
              <div class="stat-key">Volume</div>
              <div class="detail-stat-value">{pounds(summary.volumeLb)}</div>
            </div>
          </div>
          {volumeChange !== null && (
            <p class={`summary-volume${volumeChange > 0 ? ' up' : ''}`}>
              {volumeChange === 0
                ? `Same volume as your last ${title}`
                : `${volumeChange > 0 ? '+' : '-'}${pounds(Math.abs(volumeChange))} compared with your last ${title}`}
            </p>
          )}
          {summary.workingSets === 0 && <p class="hint">No working sets were logged in this workout.</p>}
          {records.length > 0 && (
            <section class="summary-card summary-records">
              <h2 class="section-label">{records.length === 1 ? 'New record' : 'New records'}</h2>
              {records.map((item) => (
                <div class="summary-row" key={item.entry.id}>
                  <span>{item.exercise?.name}</span>
                  <span class="up">{item.exercise && item.best && formatSet(item.exercise.kind, { weightLb: item.best.weightLb ?? null, reps: item.best.reps ?? null, seconds: item.best.seconds ?? null })}</span>
                </div>
              ))}
            </section>
          )}
          {progressed.length > 0 && (
            <section class="summary-card">
              <h2 class="section-label">Moved up</h2>
              {progressed.map((item) => (
                <div class="summary-row" key={item.entry.id}>
                  <span>{item.exercise?.name}</span>
                  <span class="up">{item.change && formatChange(item.change)}</span>
                </div>
              ))}
            </section>
          )}
          {summary.nextTime.length > 0 && (
            <section class="summary-card">
              <h2 class="section-label">Next time</h2>
              {summary.nextTime.map((line) => (
                <div class="summary-row" key={line.name}>
                  <span>{line.name}</span>
                  <span>{formatSets(line.kind, line.target)}</span>
                </div>
              ))}
            </section>
          )}
          {summary.week.length > 0 && (
            <section class="summary-card">
              <h2 class="section-label">This week</h2>
              {summary.week.map((line) => (
                <div class="summary-row" key={line.muscle}>
                  <span>{MUSCLE_LABELS[line.muscle]}</span>
                  <span class={line.sets >= line.goal ? 'up' : ''}>
                    {sets(line.sets)} of {line.goal}
                  </span>
                </div>
              ))}
            </section>
          )}
          <button type="button" class="primary-button" onClick={() => navigate('#/')}>
            Done
          </button>
          <a class="link-button summary-link" href={historyHash(workout.id)}>
            See every set
          </a>
        </>
      )}
    </main>
  );
}
