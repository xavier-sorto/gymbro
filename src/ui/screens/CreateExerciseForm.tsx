import { useState } from 'preact/hooks';
import {
  addWorkoutExercise,
  createExercise,
  findSimilarExercises,
  getDayType,
  updateDayType,
  DuplicateNameError,
} from '../../store';
import type { ExerciseCategory, ExerciseKind, Exercise, Workout } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { reportError } from '../errors';
import { useLoad } from '../useLoad';

interface CreateExerciseFormProps {
  initialName: string;
  workout: Workout;
  onUseExisting: (exerciseId: string) => void;
  onCreated: () => void;
}

const KINDS: { value: ExerciseKind; label: string }[] = [
  { value: 'weighted', label: 'Weights' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'timed', label: 'Timed' },
];
const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'heavy', label: 'Heavy' },
  { value: 'compound', label: 'Compound' },
  { value: 'isolation', label: 'Isolation' },
];

export function CreateExerciseForm({ initialName, workout, onUseExisting, onCreated }: CreateExerciseFormProps) {
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<ExerciseKind>('weighted');
  const [category, setCategory] = useState<ExerciseCategory>('compound');
  const [alsoAddToDay, setAlsoAddToDay] = useState(false);
  const [similar, setSimilar] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dayType = useLoad(
    'loading the day type',
    "Couldn't load the day type.",
    () => (workout.dayTypeId ? getDayType(workout.dayTypeId) : Promise.resolve(null)),
    [workout.dayTypeId],
  );

  const create = async () => {
    try {
      const exercise = await createExercise({ name, kind, category });
      await addWorkoutExercise(workout.id, exercise.id);
      if (alsoAddToDay && dayType.data) {
        await updateDayType(dayType.data.id, { exerciseIds: [...dayType.data.exerciseIds, exercise.id] });
      }
      onCreated();
    } catch (failure) {
      const message =
        failure instanceof DuplicateNameError ? 'An exercise with this name already exists. Pick it from the list.' : "Couldn't create the exercise. Try again.";
      setError(reportError('creating an exercise', failure, message));
    }
  };

  const checkThenCreate = async () => {
    try {
      const found = await findSimilarExercises(name);
      if (found.length > 0) setSimilar(found);
      else await create();
    } catch (failure) {
      setError(reportError('checking for similar exercises', failure, "Couldn't check for similar names. Try again."));
    }
  };

  return (
    <form class="create-form" onSubmit={(event) => { event.preventDefault(); void checkThenCreate(); }}>
      <label>
        Name
        <input type="text" value={name} onInput={(event) => { setName(event.currentTarget.value); setSimilar([]); }} />
      </label>
      <label>
        Kind
        <select value={kind} onChange={(event) => setKind(event.currentTarget.value as ExerciseKind)}>
          {KINDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Type
        <select value={category} onChange={(event) => setCategory(event.currentTarget.value as ExerciseCategory)}>
          {CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {dayType.data && (
        <label class="checkbox-row">
          <input type="checkbox" checked={alsoAddToDay} onChange={(event) => setAlsoAddToDay(event.currentTarget.checked)} />
          Also add to {dayType.data.name}
        </label>
      )}
      {similar.length > 0 && (
        <div class="similar">
          <p>Did you mean…</p>
          {similar.map((exercise) => (
            <button key={exercise.id} type="button" onClick={() => onUseExisting(exercise.id)}>
              {exercise.name} — Use this
            </button>
          ))}
          <button type="button" onClick={() => void create()}>
            Create anyway
          </button>
        </div>
      )}
      {error && <ErrorNotice message={error} />}
      {similar.length === 0 && (
        <button type="submit" class="primary-button">
          Create
        </button>
      )}
    </form>
  );
}
