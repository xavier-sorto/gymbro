import type { Exercise } from '../../store';
import { Icon } from '../components/Icon';
import { StepperField } from '../components/StepperField';
import { useCssHeight } from '../useCssHeight';
import type { SaveFailure } from './useExerciseLog';
import type { SetDraft } from './setDraft';

interface NextSetRowProps {
  exercise: Pick<Exercise, 'kind' | 'weightStepLb'>;
  draft: SetDraft;
  failure: SaveFailure | null;
  onChange: (patch: Partial<SetDraft>) => void;
  onSave: () => void;
  /** One line shown above the steppers, e.g. today's target. */
  today?: string;
  /** A shortcut to the next exercise, kept on the warm-up row so the logger stays short. */
  next?: { label: string; onGo: () => void };
  /** When docked, the CSS variable that should follow this panel's height. */
  heightVar?: string;
}

const TIMED_STEP_SECONDS = 5;

const fieldError = (failure: SaveFailure | null, field: string) =>
  failure?.kind === 'validation' && failure.field === field ? failure.message : null;

export function NextSetRow({ exercise, draft, failure, onChange, onSave, today, next, heightVar }: NextSetRowProps) {
  const failed = failure !== null && failure.kind !== 'validation';
  const heightRef = useCssHeight(heightVar ?? null);
  return (
    <section ref={heightRef} class={`next-set${failed ? ' next-set-failed' : ''}`}>
      {today && <p class="next-set-today">{today}</p>}
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
      <div class="next-set-foot">
        <label class="warmup-toggle">
          <input type="checkbox" checked={draft.isWarmup} onChange={(event) => onChange({ isWarmup: event.currentTarget.checked })} />
          Warm-up
        </label>
        {next && (
          <button type="button" class="link-button next-set-next" onClick={next.onGo}>
            <span>Next: {next.label}</span>
            <Icon name="chevronRight" />
          </button>
        )}
      </div>
      <button type="button" class="primary-button" onClick={onSave}>
        {failed ? 'Retry' : 'Save set'}
      </button>
    </section>
  );
}
