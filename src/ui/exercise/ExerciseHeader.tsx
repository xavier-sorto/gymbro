import { useState } from 'preact/hooks';
import { updateWorkoutExercise } from '../../store';
import type { Exercise, WorkoutExercise } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { reportError } from '../errors';

interface ExerciseHeaderProps {
  entry: WorkoutExercise;
  exercise: Exercise;
  onChanged: () => void;
}

export function ExerciseHeader({ entry, exercise, onChanged }: ExerciseHeaderProps) {
  const [note, setNote] = useState(entry.note);
  const [error, setError] = useState<string | null>(null);

  const update = async (what: string, patch: { isMainLift?: boolean; note?: string }) => {
    try {
      await updateWorkoutExercise(entry.id, patch);
      setError(null);
      onChanged();
    } catch (failure) {
      setError(reportError(what, failure, "Couldn't save that change. Try again."));
    }
  };

  return (
    <header>
      <div class="exercise-title">
        <h1>{exercise.name}</h1>
        <button
          type="button"
          class="star-button"
          aria-pressed={entry.isMainLift}
          aria-label="Main lift"
          onClick={() => update('toggling main lift', { isMainLift: !entry.isMainLift })}
        >
          {entry.isMainLift ? '★' : '☆'}
        </button>
      </div>
      <textarea
        aria-label="Note"
        placeholder="Note"
        maxLength={500}
        value={note}
        onInput={(event) => setNote(event.currentTarget.value)}
        onBlur={() => note !== entry.note && update('saving the note', { note })}
      />
      {error && <ErrorNotice message={error} />}
    </header>
  );
}
