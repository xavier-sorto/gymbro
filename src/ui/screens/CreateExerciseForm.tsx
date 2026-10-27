import { useState } from 'preact/hooks';
import { createExercise, findSimilarExercises, DuplicateNameError } from '../../store';
import type { DayType, Exercise, ExerciseCategory, ExerciseKind } from '../../store';
import { MusclePicker } from '../library/MusclePicker';
import type { MuscleDraft } from '../library/exerciseDraft';
import { ErrorNotice } from '../components/ErrorNotice';
import { CATEGORY_OPTIONS, KIND_OPTIONS } from '../exercise/exerciseOptions';
import { reportError } from '../errors';

interface CreateExerciseFormProps {
  initialName: string;
  /** When given, the form offers "Also add to <day type>" (off by default). */
  alsoAddTo?: DayType | null;
  onUseExisting: (exerciseId: string) => void;
  /** Called with the new exercise once it exists; it throws if what follows (adding it somewhere) fails. */
  onCreated: (exercise: Exercise, alsoAdd: boolean) => Promise<void>;
}

export function CreateExerciseForm({ initialName, alsoAddTo, onUseExisting, onCreated }: CreateExerciseFormProps) {
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<ExerciseKind>('weighted');
  const [category, setCategory] = useState<ExerciseCategory>('compound');
  const [muscles, setMuscles] = useState<MuscleDraft>({ primaryMuscle: null, secondaryMuscles: [] });
  const [alsoAdd, setAlsoAdd] = useState(false);
  const [similar, setSimilar] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    try {
      const exercise = await createExercise({
        name,
        kind,
        category,
        // Leaving the muscle unset stores nothing, which stays different from choosing none later.
        ...(muscles.primaryMuscle ? muscles : {}),
      });
      await onCreated(exercise, alsoAdd);
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
          {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Type
        <select value={category} onChange={(event) => setCategory(event.currentTarget.value as ExerciseCategory)}>
          {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <MusclePicker value={muscles} onChange={setMuscles} />
      {alsoAddTo && (
        <label class="checkbox-row">
          <input type="checkbox" checked={alsoAdd} onChange={(event) => setAlsoAdd(event.currentTarget.checked)} />
          Also add to {alsoAddTo.name}
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
