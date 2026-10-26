import { useState } from 'preact/hooks';
import { addWorkoutExercise, listExercises } from '../../store';
import type { Exercise } from '../../store';
import { useActiveWorkout } from '../AppContext';
import { ErrorNotice } from '../components/ErrorNotice';
import { listRecentExerciseIds } from '../data/workoutData';
import { reportError } from '../errors';
import { navigate } from '../router';
import { useLoad } from '../useLoad';
import { CreateExerciseForm } from './CreateExerciseForm';

const RECENT_COUNT = 5;

async function loadChoices() {
  const [exercises, recentIds] = await Promise.all([listExercises(), listRecentExerciseIds(RECENT_COUNT)]);
  const recent = recentIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => e !== undefined);
  return { exercises, recent };
}

export function AddExerciseScreen() {
  const workout = useActiveWorkout();
  const choices = useLoad('loading the exercise library', "Couldn't load your exercises.", loadChoices, []);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const typed = query.trim();
  const shown = typed
    ? (choices.data?.exercises ?? []).filter((e) => e.nameKey.includes(typed.toLowerCase()) || e.name.toLowerCase().includes(typed.toLowerCase()))
    : (choices.data?.recent ?? []);

  const add = async (exerciseId: string) => {
    try {
      await addWorkoutExercise(workout.id, exerciseId);
      navigate('#/workout');
    } catch (error) {
      setAddError(reportError('adding an exercise', error, "Couldn't add the exercise. Try again."));
    }
  };

  return (
    <main class="screen">
      <button type="button" class="link-button" onClick={() => navigate('#/workout')}>
        ‹ Workout
      </button>
      <h1>Add exercise</h1>
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises"
        autofocus
        value={query}
        onInput={(event) => setQuery(event.currentTarget.value)}
      />
      {choices.error && <ErrorNotice message={choices.error} onRetry={choices.reload} />}
      {addError && <ErrorNotice message={addError} />}
      {!typed && <h2>Recent</h2>}
      <ul class="exercise-choices">
        {shown.map((exercise) => (
          <li key={exercise.id}>
            <button type="button" onClick={() => add(exercise.id)}>
              {exercise.name}
            </button>
          </li>
        ))}
      </ul>
      {typed && !creating && (
        <button type="button" class="big-button secondary" onClick={() => setCreating(true)}>
          Create "{typed}"
        </button>
      )}
      {typed && creating && <CreateExerciseForm initialName={typed} workout={workout} onUseExisting={add} onCreated={() => navigate('#/workout')} />}
    </main>
  );
}
