import { useState } from 'preact/hooks';
import { ValidationError, updateWorkoutDetails } from '../../store';
import type { Workout } from '../../store';
import { Sheet } from '../components/Sheet';
import { reportError } from '../errors';

const pad = (value: number) => String(value).padStart(2, '0');

/** The "YYYY-MM-DDTHH:mm" text a datetime-local input uses, in local time. */
export function toLocalInput(time: number): string {
  const day = new Date(time);
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(day.getHours())}:${pad(day.getMinutes())}`;
}

interface EditWorkoutSheetProps {
  workout: Workout;
  onSaved: () => void;
  onClose: () => void;
}

/** Fix when a workout happened (the finish moves with it) and keep a note about it. */
export function EditWorkoutSheet({ workout, onSaved, onClose }: EditWorkoutSheetProps) {
  const originalWhen = toLocalInput(workout.startedAt);
  const [when, setWhen] = useState(originalWhen);
  const [note, setNote] = useState(workout.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      // The input has minute precision, so an untouched date must not shift the stored seconds.
      await updateWorkoutDetails(workout.id, { note, ...(when === originalWhen ? {} : { startedAt: new Date(when).getTime() }) });
      onSaved();
    } catch (failure) {
      setError(
        failure instanceof ValidationError
          ? `${failure.field === 'startedAt' ? 'Date' : 'Note'} ${failure.reason}`
          : reportError('saving the workout details', failure, "Couldn't save. Try again."),
      );
    }
  };

  return (
    <Sheet title="Edit workout" onClose={onClose}>
      <div class="edit-form">
        <label>
          Date and time
          <input type="datetime-local" aria-label="Date and time" value={when} onInput={(event) => setWhen(event.currentTarget.value)} />
        </label>
        <label>
          Note
          <textarea rows={3} maxLength={500} aria-label="Note" value={note} onInput={(event) => setNote(event.currentTarget.value)} />
        </label>
      </div>
      {error && <p class="field-error">{error}</p>}
      <button type="button" class="primary-button" onClick={save}>
        Save
      </button>
    </Sheet>
  );
}
