import { useEffect, useState } from 'preact/hooks';
import type { WorkoutSet } from '../../store';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { EditSetSheet } from '../exercise/EditSetSheet';
import { ExerciseHeader } from '../exercise/ExerciseHeader';
import { GuidePanel } from '../exercise/GuidePanel';
import { LoggedSets } from '../exercise/LoggedSets';
import { NextSetRow } from '../exercise/NextSetRow';
import { useExerciseLog } from '../exercise/useExerciseLog';
import { navigate } from '../router';

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
      {data && draft && (
        <>
          <ExerciseHeader key={data.entry.updatedAt} entry={data.entry} exercise={data.exercise} onChanged={log.reload} />
          {log.record && <p class="notice">New personal best!</p>}
          <GuidePanel kind={data.exercise.kind} guide={data.guide} status={data.guideStatus} />
          <LoggedSets kind={data.exercise.kind} sets={data.sets} onEdit={setEditing} />
          <NextSetRow exercise={data.exercise} draft={draft} failure={log.failure} onChange={log.changeDraft} onSave={log.save} />
          {editing && (
            <EditSetSheet
              set={editing}
              exercise={data.exercise}
              onClose={() => setEditing(null)}
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
