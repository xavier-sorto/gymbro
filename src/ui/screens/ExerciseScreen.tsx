import { useEffect, useState } from 'preact/hooks';
import { restoreSet } from '../../store';
import type { ExerciseKind, WorkoutSet } from '../../store';
import type { Guide } from '../../engine';
import { formatSets } from '../format';
import type { GuideStatus } from '../exercise/loadExercise';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { UndoToast } from '../components/UndoToast';
import { EditSetSheet } from '../exercise/EditSetSheet';
import { ExerciseHeader } from '../exercise/ExerciseHeader';
import { GuidePanel } from '../exercise/GuidePanel';
import { LoggedSets } from '../exercise/LoggedSets';
import { NextSetRow } from '../exercise/NextSetRow';
import { useExerciseLog } from '../exercise/useExerciseLog';
import { exerciseHash, navigate } from '../router';

/** "Today 60 × 7, 7, 6 · One more rep": the target, kept in the logger so it never scrolls out of sight. */
function todayLine(kind: ExerciseKind, guide: Guide, status: GuideStatus): string | undefined {
  if (status !== 'ok' || !guide.target) return undefined;
  return `Today ${formatSets(kind, guide.target.sets)}${guide.target.note ? ` · ${guide.target.note}` : ''}`;
}

export function ExerciseScreen({ workoutExerciseId }: { workoutExerciseId: string }) {
  const log = useExerciseLog(workoutExerciseId);
  const [editing, setEditing] = useState<WorkoutSet | null>(null);

  useEffect(() => {
    if (log.missing) navigate('#/');
  }, [log.missing]);

  const { data, draft } = log;
  return (
    <main class="screen">
      <BackLink to="#/workout" label="Workout" />
      {log.error && <ErrorNotice message={log.error} onRetry={log.reload} />}
      {log.undoError && <ErrorNotice message={log.undoError} />}
      {log.undo && <UndoToast id={log.undo.id} message={log.undo.message} onUndo={() => void log.undoNow()} onExpire={log.dismissUndo} />}
      {data && draft && (
        <>
          <ExerciseHeader key={data.entry.updatedAt} entry={data.entry} exercise={data.exercise} onChanged={log.reload} />
          {data.exercise.notes && <p class="exercise-cues">{data.exercise.notes}</p>}
          {log.record && <p class="notice">New personal best!</p>}
          <GuidePanel kind={data.exercise.kind} guide={data.guide} status={data.guideStatus} />
          <LoggedSets kind={data.exercise.kind} sets={data.sets} onEdit={setEditing} />
          <NextSetRow
            exercise={data.exercise}
            draft={draft}
            failure={log.failure}
            onChange={log.changeDraft}
            onSave={log.save}
            today={todayLine(data.exercise.kind, data.guide, data.guideStatus)}
            next={data.next ? { label: data.next.name, onGo: () => navigate(exerciseHash(data.next!.entryId)) } : undefined}
            heightVar="--logger-height"
          />
          {editing && (
            <EditSetSheet
              set={editing}
              exercise={data.exercise}
              onClose={() => setEditing(null)}
              onDeleted={(deleted) =>
                log.offerUndo('Set deleted', async () => {
                  await restoreSet(deleted.id);
                  log.reload();
                })
              }
              onChanged={() => {
                setEditing(null);
                log.reload();
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
