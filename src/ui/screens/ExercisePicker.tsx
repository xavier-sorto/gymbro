import { useState } from 'preact/hooks';
import { listExercises } from '../../store';
import type { DayType, Exercise } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { SearchField } from '../components/SearchField';
import { filterExercisesByName } from '../exercise/filterExercises';
import { listRecentExerciseIds } from '../data/workoutData';
import { reportError } from '../errors';
import { useLoad } from '../useLoad';
import { CreateExerciseForm } from './CreateExerciseForm';

const RECENT_COUNT = 5;

async function loadChoices() {
  const [exercises, recentIds] = await Promise.all([listExercises(), listRecentExerciseIds(RECENT_COUNT)]);
  const recent = recentIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => e !== undefined);
  return { exercises, recent };
}

interface ExercisePickerProps {
  /** Adds an existing exercise somewhere; throws on failure. */
  onPick: (exerciseId: string) => Promise<void>;
  /** Adds a freshly created exercise somewhere (and to the day type if asked); throws on failure. */
  onCreated: (exercise: Exercise, alsoAdd: boolean) => Promise<void>;
  /** Offered as "Also add to <day type>" on the create form. */
  alsoAddTo?: DayType | null;
}

/** Search the library (Recent when empty) or create a new exercise. */
export function ExercisePicker({ onPick, onCreated, alsoAddTo }: ExercisePickerProps) {
  const choices = useLoad('loading the exercise library', "Couldn't load your exercises.", loadChoices, []);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const typed = query.trim();
  const shown = typed
    ? filterExercisesByName(choices.data?.exercises ?? [], typed)
    : (choices.data?.recent ?? []);

  const pick = async (exerciseId: string) => {
    try {
      await onPick(exerciseId);
    } catch (error) {
      setPickError(reportError('adding an exercise', error, "Couldn't add the exercise. Try again."));
    }
  };

  return (
    <>
      <SearchField value={query} onChange={setQuery} autofocus />
      {choices.error && <ErrorNotice message={choices.error} onRetry={choices.reload} />}
      {pickError && <ErrorNotice message={pickError} />}
      {!typed && <h2 class="section-label">Recent</h2>}
      <ul class="exercise-choices">
        {shown.map((exercise) => (
          <li key={exercise.id}>
            <button type="button" class="list-row" onClick={() => pick(exercise.id)}>
              {exercise.name}
              <Icon name="plus" />
            </button>
          </li>
        ))}
      </ul>
      {typed && !creating && (
        <button type="button" class="big-button secondary create-prompt" onClick={() => setCreating(true)}>
          Create "{typed}"
        </button>
      )}
      {typed && creating && (
        <CreateExerciseForm initialName={typed} alsoAddTo={alsoAddTo} onUseExisting={pick} onCreated={onCreated} />
      )}
    </>
  );
}
