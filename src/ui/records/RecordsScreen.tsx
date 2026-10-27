import { bestSoFar, countingSessions, estimatedOneRepMax } from '../../engine';
import { getExerciseHistory, listExercises } from '../../store';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { formatSet, formatShortDate } from '../format';
import { MAX_SESSIONS } from '../progress-chart/ProgressChartScreen';
import { progressHash } from '../router';
import { useLoad } from '../useLoad';

async function loadRecords() {
  const rows = await Promise.all(
    (await listExercises()).map(async (exercise) => {
      const history = await getExerciseHistory(exercise.id, { sessions: MAX_SESSIONS });
      return { exercise, best: bestSoFar(countingSessions(history, exercise.kind), exercise.kind) };
    }),
  );
  return rows.flatMap(({ exercise, best }) => (best ? [{ exercise, best }] : []));
}

export function RecordsScreen() {
  const records = useLoad('loading personal records', "Couldn't load your records.", loadRecords, []);
  return (
    <main class="screen">
      <BackLink to="#/library" label="Library" />
      <h1 class="h1 library-title">Personal records</h1>
      {records.error && <ErrorNotice message={records.error} onRetry={records.reload} />}
      {records.data?.length === 0 && <p class="hint">Finish a workout and your best sets will show up here.</p>}
      {records.data?.map(({ exercise, best }) => (
        <a key={exercise.id} class="library-row" href={progressHash(exercise.id)}>
          <div class="library-row-text">
            <div class="library-row-name">{exercise.name}</div>
            <div class="card-sub">
              {formatShortDate(best.startedAt)}
              {exercise.kind === 'weighted' && ` · about ${estimatedOneRepMax(best.weightLb ?? 0, best.reps ?? 0)} lb for 1 rep`}
            </div>
          </div>
          <strong>{formatSet(exercise.kind, { weightLb: best.weightLb ?? null, reps: best.reps ?? null, seconds: best.seconds ?? null })}</strong>
          <Icon name="chevronRight" />
        </a>
      ))}
    </main>
  );
}
