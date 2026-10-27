import { useEffect, useState } from 'preact/hooks';
import { beatsBest, isWorkingSet, prefillNext, restAfter, toPlannedSet } from '../../engine';
import { StorageFullError, ValidationError, deleteSet, saveSet } from '../../store';
import { reportError } from '../errors';
import { unlockAudio } from '../rest/beep';
import { skipRest, startRest } from '../rest/restTimer';
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
  const [record, setRecord] = useState(false);
  const [undo, setUndo] = useState<{ id: number; message: string; run: () => Promise<void> } | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const data = loaded.data === 'missing' ? null : loaded.data;

  useEffect(() => {
    if (!data) return;
    setDraft(draftFromPlan(prefillNext(data.guide, data.sets), data.exercise));
    setFailure(null);
  }, [data]);

  /** Offers a short Undo; a newer offer replaces an older one. */
  const offerUndo = (message: string, run: () => Promise<void>) => setUndo({ id: Date.now() + Math.random(), message, run });
  const dismissUndo = () => setUndo(null);
  const undoNow = async () => {
    const current = undo;
    setUndo(null);
    if (!current) return;
    try {
      await current.run();
      setUndoError(null);
    } catch (error) {
      setUndoError(reportError('undoing a change', error, "Couldn't undo that."));
    }
  };

  const changeDraft = (patch: Partial<SetDraft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const save = async () => {
    if (!data || !draft) return;
    unlockAudio();
    try {
      const saved = await saveSet({ workoutExerciseId: data.entry.id, ...draftToInput(data.exercise.kind, draft) });
      const { kind } = data.exercise;
      const working = (set: typeof saved) => isWorkingSet(set, kind);
      setRecord(working(saved) && beatsBest(kind, toPlannedSet(saved), data.guide.best, data.sets.filter(working).map(toPlannedSet)));
      startRest(restAfter(data.exercise, saved), data.entry.id);
      offerUndo('Set saved', async () => {
        await deleteSet(saved.id);
        skipRest();
        loaded.reload();
      });
      loaded.reload();
    } catch (error) {
      const message = reportError('saving a set', error, SAVE_FAILED_MESSAGE);
      if (error instanceof ValidationError) setFailure({ kind: 'validation', message: error.reason, field: error.field });
      else setFailure({ kind: error instanceof StorageFullError ? 'storage-full' : 'other', message });
    }
  };

  return { ...loaded, data, missing: loaded.data === 'missing', draft, changeDraft, save, failure, record, undo, undoNow, dismissUndo, undoError, offerUndo };
}
