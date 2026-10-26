import { useState } from 'preact/hooks';
import { deleteSet, updateSet, ValidationError } from '../../store';
import type { Exercise, WorkoutSet } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { Sheet } from '../components/Sheet';
import { reportError } from '../errors';
import { NextSetRow } from './NextSetRow';
import { draftFromPlan, draftToInput, type SetDraft } from './setDraft';
import type { SaveFailure } from './useExerciseLog';

interface EditSetSheetProps {
  set: WorkoutSet;
  exercise: Exercise;
  onClose: () => void;
  /** Called after the set was changed or deleted. */
  onChanged: () => void;
}

export function EditSetSheet({ set, exercise, onClose, onChanged }: EditSetSheetProps) {
  const [draft, setDraft] = useState<SetDraft>(() => draftFromPlan({ ...set, role: 'working' }, exercise));
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = async () => {
    try {
      await updateSet(set.id, draftToInput(exercise.kind, draft));
      onChanged();
    } catch (error) {
      const message = reportError('editing a set', error, "Couldn't save. Tap to retry.");
      if (error instanceof ValidationError) setFailure({ kind: 'validation', message: error.reason, field: error.field });
      else setFailure({ kind: 'other', message });
    }
  };

  const remove = async () => {
    try {
      await deleteSet(set.id);
      onChanged();
    } catch (error) {
      setDeleteError(reportError('deleting a set', error, "Couldn't delete the set. Try again."));
    }
  };

  return (
    <Sheet title="Edit set" onClose={onClose}>
      <NextSetRow
        exercise={exercise}
        draft={draft}
        failure={failure}
        onChange={(patch) => setDraft({ ...draft, ...patch })}
        onSave={save}
      />
      {deleteError && <ErrorNotice message={deleteError} />}
      <button type="button" class="danger-button" onClick={remove}>
        Delete set
      </button>
    </Sheet>
  );
}
