import { MUSCLES, MUSCLE_LABELS } from '../../engine';
import type { Muscle } from '../../store';
import { MAX_SECONDARY_MUSCLES, withPrimaryMuscle, withSecondaryToggled, type MuscleDraft } from './exerciseDraft';

interface MusclePickerProps {
  value: MuscleDraft;
  onChange: (next: MuscleDraft) => void;
}

/** The main muscle and the helper muscles an exercise counts toward in weekly volume. */
export function MusclePicker({ value, onChange }: MusclePickerProps) {
  return (
    <>
      <label>
        Main muscle (for weekly volume)
        <select
          value={value.primaryMuscle ?? ''}
          onChange={(event) => {
            const chosen = event.currentTarget.value;
            onChange(withPrimaryMuscle(value, chosen === '' ? null : (chosen as Muscle)));
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
      {value.primaryMuscle && (
        <div class="segmented-field">
          <span class="field-caption">Also works (counts half, up to {MAX_SECONDARY_MUSCLES})</span>
          <div class="muscle-chips">
            {MUSCLES.filter((muscle) => muscle !== value.primaryMuscle).map((muscle) => {
              const on = value.secondaryMuscles.includes(muscle);
              return (
                <button
                  key={muscle}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && value.secondaryMuscles.length >= MAX_SECONDARY_MUSCLES}
                  onClick={() => onChange(withSecondaryToggled(value, muscle))}
                >
                  {MUSCLE_LABELS[muscle]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
