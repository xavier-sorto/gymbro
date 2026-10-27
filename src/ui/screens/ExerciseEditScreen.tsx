import { getExercise } from '../../store';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { countExerciseSets } from '../data/libraryData';
import { ExerciseEditForm } from '../library/ExerciseEditForm';
import { useLoad } from '../useLoad';

async function loadExerciseForEdit(exerciseId: string) {
  const exercise = await getExercise(exerciseId);
  return { exercise, setCount: await countExerciseSets(exerciseId) };
}

export function ExerciseEditScreen({ exerciseId }: { exerciseId: string }) {
  const loaded = useLoad(
    'loading an exercise to edit',
    "Couldn't load this exercise. It may have been deleted.",
    () => loadExerciseForEdit(exerciseId),
    [exerciseId],
  );

  if (loaded.data && loaded.data.exercise.mergedInto === null) {
    return <ExerciseEditForm exercise={loaded.data.exercise} setCount={loaded.data.setCount} />;
  }
  return (
    <main class="screen">
      <BackLink to="#/library" label="Library" />
      {loaded.data && <ErrorNotice message="This exercise was merged into another one, so it can't be edited." />}
      {loaded.error && <ErrorNotice message={loaded.error} onRetry={loaded.reload} />}
    </main>
  );
}
