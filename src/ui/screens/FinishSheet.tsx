import { useState } from 'preact/hooks';
import { finishWorkout, listSets } from '../../store';
import { useActiveWorkout, useApp } from '../AppContext';
import { ErrorNotice } from '../components/ErrorNotice';
import { Sheet } from '../components/Sheet';
import { listWorkoutEntries } from '../data/workoutData';
import { reportError } from '../errors';
import { formatDuration, pluralExercises, pluralSets } from '../format';
import { skipRest } from '../rest/restTimer';
import { navigate, summaryHash } from '../router';
import { useLoad } from '../useLoad';

interface Summary {
  exercisesWithSets: number;
  workingSets: number;
}

async function summarize(workoutId: string): Promise<Summary> {
  const entries = await listWorkoutEntries(workoutId);
  const counts = await Promise.all(entries.map(async (entry) => (await listSets(entry.id)).filter((s) => !s.isWarmup).length));
  return { exercisesWithSets: counts.filter((count) => count > 0).length, workingSets: counts.reduce((a, b) => a + b, 0) };
}

export function FinishSheet({ onClose }: { onClose: () => void }) {
  const workout = useActiveWorkout();
  const { refreshActive } = useApp();
  const summary = useLoad('summarizing the workout', "Couldn't count your sets.", () => summarize(workout.id), [workout.id]);
  const [finishError, setFinishError] = useState<string | null>(null);

  const finish = async () => {
    try {
      await finishWorkout(workout.id);
      skipRest();
      // Leave the workout screens first: once no workout is active they redirect home.
      navigate(summaryHash(workout.id));
      await refreshActive();
    } catch (error) {
      setFinishError(reportError('finishing the workout', error, "Couldn't finish the workout. Try again."));
    }
  };

  return (
    <Sheet title="Finish workout" onClose={onClose}>
      {summary.error && <ErrorNotice message={summary.error} onRetry={summary.reload} />}
      {summary.data && (
        <p>
          {pluralExercises(summary.data.exercisesWithSets)} · {pluralSets(summary.data.workingSets)} ·{' '}
          {formatDuration(Date.now() - workout.startedAt)}
        </p>
      )}
      {finishError && <ErrorNotice message={finishError} />}
      <button type="button" class="primary-button" onClick={finish}>
        Finish
      </button>
    </Sheet>
  );
}
