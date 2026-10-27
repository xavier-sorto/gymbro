import { useState } from 'preact/hooks';
import { deleteExercise, DuplicateNameError, getExercise, updateExercise } from '../../store';
import type { Exercise } from '../../store';
import { BackLink } from '../components/BackLink';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { SegmentedField } from '../components/SegmentedField';
import { StepperField } from '../components/StepperField';
import { MUSCLES, MUSCLE_LABELS } from '../../engine';
import { CATEGORY_OPTIONS, KIND_OPTIONS, SET_STYLE_OPTIONS, kindLabel } from '../exercise/exerciseOptions';
import { reportError } from '../errors';
import { navigate } from '../router';
import { MAX_SECONDARY_MUSCLES, toDraft, toPatch, withCategory, withPrimaryMuscle, withSecondaryToggled, type ExerciseDraft } from './exerciseDraft';
import { MergeIntoSheet } from './MergeIntoSheet';

type Dialog = 'kind-change' | 'delete' | 'merge' | null;

interface ExerciseEditFormProps {
  exercise: Exercise;
  setCount: number;
}

export function ExerciseEditForm({ exercise, setCount }: ExerciseEditFormProps) {
  const [draft, setDraft] = useState<ExerciseDraft>(() => toDraft(exercise));
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameClash, setNameClash] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (patch: Partial<ExerciseDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setNameClash(null);
  };

  const showNameClash = async (failure: DuplicateNameError) => {
    try {
      setNameClash(await getExercise(failure.existingId));
      setError(null);
    } catch (lookupFailure) {
      setError(
        reportError('looking up the exercise with the same name', lookupFailure, 'Another exercise already has this name. Pick a different name.'),
      );
    }
  };

  const persist = async () => {
    setDialog(null);
    setSaving(true);
    try {
      await updateExercise(exercise.id, toPatch(draft));
      navigate('#/library');
    } catch (failure) {
      setSaving(false);
      if (failure instanceof DuplicateNameError) await showNameClash(failure);
      else setError(reportError('saving an exercise', failure, "Couldn't save the exercise. Your changes are still here. Try again."));
    }
  };

  const save = () => {
    setError(null);
    if (draft.kind !== exercise.kind && setCount > 0) setDialog('kind-change');
    else void persist();
  };

  const remove = async () => {
    setDialog(null);
    try {
      await deleteExercise(exercise.id);
      navigate('#/library');
    } catch (failure) {
      setError(reportError('deleting an exercise', failure, "Couldn't delete the exercise. Try again."));
    }
  };

  return (
    <main class="screen">
      <div class="top">
        <BackLink to="#/library" label="Library" />
        <button type="button" class="primary-button library-save" disabled={saving} onClick={save}>
          Save
        </button>
      </div>
      <div class="edit-form">
        <label>
          Name
          <input type="text" value={draft.name} onInput={(event) => change({ name: event.currentTarget.value })} />
        </label>
        <SegmentedField label="Kind" options={KIND_OPTIONS} value={draft.kind} onChange={(kind) => change({ kind })} />
        <SegmentedField
          label="Type"
          options={CATEGORY_OPTIONS}
          value={draft.category}
          onChange={(category) => setDraft((current) => withCategory(current, category))}
        />
        <SegmentedField label="Set style" options={SET_STYLE_OPTIONS} value={draft.setStyle} onChange={(setStyle) => change({ setStyle })} />
        <div class="edit-numbers">
          <StepperField label="Reps min" value={draft.repMin} step={1} onChange={(repMin) => change({ repMin })} />
          <StepperField label="Reps max" value={draft.repMax} step={1} onChange={(repMax) => change({ repMax })} />
          <StepperField label="Weight step (lb)" value={draft.weightStepLb} step={2.5} decimal onChange={(weightStepLb) => change({ weightStepLb })} />
          <StepperField label="Warm-up sets" value={draft.warmupSets} step={1} onChange={(warmupSets) => change({ warmupSets })} />
          <StepperField label="Rest (seconds)" value={draft.restSeconds} step={15} onChange={(restSeconds) => change({ restSeconds })} />
        </div>
        <label>
          Main muscle
          <select
            value={draft.primaryMuscle ?? ''}
            onChange={(event) => {
              const chosen = event.currentTarget.value;
              setDraft((current) => withPrimaryMuscle(current, chosen === '' ? null : (chosen as (typeof MUSCLES)[number])));
              setNameClash(null);
            }}
          >
            <option value="">Not set</option>
            {MUSCLES.map((muscle) => (
              <option key={muscle} value={muscle}>
                {MUSCLE_LABELS[muscle]}
              </option>
            ))}
          </select>
        </label>
        {draft.primaryMuscle && (
          <div class="segmented-field">
            <span class="field-caption">Also works (counts half, up to {MAX_SECONDARY_MUSCLES})</span>
            <div class="muscle-chips">
              {MUSCLES.filter((muscle) => muscle !== draft.primaryMuscle).map((muscle) => {
                const on = draft.secondaryMuscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && draft.secondaryMuscles.length >= MAX_SECONDARY_MUSCLES}
                    onClick={() => setDraft((current) => withSecondaryToggled(current, muscle))}
                  >
                    {MUSCLE_LABELS[muscle]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label>
          Form cues
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Shown while you log this exercise"
            value={draft.notes}
            onInput={(event) => change({ notes: event.currentTarget.value })}
          />
        </label>
        <label class="checkbox-row">
          <input type="checkbox" checked={draft.favorite} onChange={(event) => change({ favorite: event.currentTarget.checked })} />
          Favorite (listed first)
        </label>
        <label class="checkbox-row">
          <input type="checkbox" checked={draft.archived} onChange={(event) => change({ archived: event.currentTarget.checked })} />
          Archived (hidden from the list and pickers)
        </label>
      </div>
      {error && <ErrorNotice message={error} />}
      {nameClash && (
        <div class="similar" role="alert">
          <p>{nameClash.name} already exists.</p>
          <button type="button" onClick={() => setDialog('merge')}>
            Merge into {nameClash.name}
          </button>
        </div>
      )}
      <div class="library-actions">
        <button type="button" class="big-button secondary" onClick={() => setDialog('merge')}>
          Merge into another exercise
        </button>
        {setCount === 0 ? (
          <button type="button" class="danger-button" onClick={() => setDialog('delete')}>
            Delete exercise
          </button>
        ) : (
          <p class="hint">Has history, merge instead</p>
        )}
      </div>
      {dialog === 'kind-change' && (
        <ConfirmSheet
          title="Change kind?"
          message={`Past sets logged as ${kindLabel(exercise.kind)} won't count toward targets or charts.`}
          confirmLabel="Change kind"
          onConfirm={() => void persist()}
          onCancel={() => {
            change({ kind: exercise.kind });
            setDialog(null);
          }}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmSheet
          title="Delete exercise?"
          message={`${exercise.name} has no sets, so nothing in your history changes.`}
          confirmLabel="Delete"
          onConfirm={() => void remove()}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'merge' && (
        <MergeIntoSheet from={exercise} setCount={setCount} initialTarget={nameClash} onClose={() => setDialog(null)} />
      )}
    </main>
  );
}
