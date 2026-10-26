import { useEffect, useState } from 'preact/hooks';
import { prefillNext, restAfter } from '../../engine';
import { StorageFullError, ValidationError, saveSet } from '../../store';
import { reportError } from '../errors';
import { unlockAudio } from '../rest/beep';
import { startRest } from '../rest/restTimer';
import { useLoad } from '../useLoad';
import { loadExercise } from './loadExercise';
import { draftFromPlan, draftToInput, type SetDraft } from './setDraft';

export interface SaveFailure {
  kind: 'storage-full' | 'other' | 'validation';
  message: string;
  /** For validation failures: the field the message belongs under. */
  field?: string;
}

export const SAVE_FAILED_MESSAGE = "Couldn't save. Tap to retry.";

/** Everything the exercise screen needs: the loaded exercise, the next-set draft and the save action. */
export function useExerciseLog(workoutExerciseId: string) {
  const loaded = useLoad(
    'loading the exercise',
    "Couldn't load this exercise.",
    () => loadExercise(workoutExerciseId),
    [workoutExerciseId],
  );
  const [draft, setDraft] = useState<SetDraft | null>(null);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const data = loaded.data === 'missing' ? null : loaded.data;

  useEffect(() => {
    if (!data) return;
    setDraft(draftFromPlan(prefillNext(data.guide, data.sets), data.exercise));
    setFailure(null);
  }, [data]);

  const changeDraft = (patch: Partial<SetDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const save = async () => {
    if (!data || !draft) return;
    unlockAudio();
    try {
      const saved = await saveSet({ workoutExerciseId: data.entry.id, ...draftToInput(data.exercise.kind, draft) });
      startRest(restAfter(data.exercise, saved), data.entry.id);
      loaded.reload();
    } catch (error) {
      const message = reportError('saving a set', error, SAVE_FAILED_MESSAGE);
      if (error instanceof ValidationError) setFailure({ kind: 'validation', message: error.reason, field: error.field });
      else setFailure({ kind: error instanceof StorageFullError ? 'storage-full' : 'other', message });
    }
  };

  return { ...loaded, data, missing: loaded.data === 'missing', draft, changeDraft, save, failure };
}
