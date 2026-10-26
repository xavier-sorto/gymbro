import type { Exercise } from '../../store';
import { StepperField } from '../components/StepperField';
import type { SaveFailure } from './useExerciseLog';
import type { SetDraft } from './setDraft';

interface NextSetRowProps {
  exercise: Pick<Exercise, 'kind' | 'weightStepLb'>;
  draft: SetDraft;
  failure: SaveFailure | null;
  onChange: (patch: Partial<SetDraft>) => void;
  onSave: () => void;
}

const TIMED_STEP_SECONDS = 5;

const fieldError = (failure: SaveFailure | null, field: string) =>
  failure?.kind === 'validation' && failure.field === field ? failure.message : null;

export function NextSetRow({ exercise, draft, failure, onChange, onSave }: NextSetRowProps) {
  const failed = failure !== null && failure.kind !== 'validation';
  return (
    <section class={`next-set${failed ? ' next-set-failed' : ''}`}>
      {failed && <p class="field-error">{failure.kind === 'storage-full' ? `Not saved. ${failure.message}` : failure.message}</p>}
      {exercise.kind === 'weighted' && (
        <StepperField
          label="Weight"
          decimal
          value={draft.weightLb}
          step={exercise.weightStepLb}
          error={fieldError(failure, 'weightLb')}
          onChange={(weightLb) => onChange({ weightLb })}
        />
      )}
      {exercise.kind === 'timed' ? (
        <StepperField
          label="Seconds"
          value={draft.seconds}
          step={TIMED_STEP_SECONDS}
          error={fieldError(failure, 'seconds')}
          onChange={(seconds) => onChange({ seconds })}
        />
      ) : (
        <StepperField label="Reps" value={draft.reps} step={1} error={fieldError(failure, 'reps')} onChange={(reps) => onChange({ reps })} />
      )}
      <label class="warmup-toggle">
        <input type="checkbox" checked={draft.isWarmup} onChange={(event) => onChange({ isWarmup: event.currentTarget.checked })} />
        Warm-up
      </label>
      <button type="button" class="primary-button" onClick={onSave}>
        {failed ? 'Retry' : 'Save set'}
      </button>
    </section>
  );
}
