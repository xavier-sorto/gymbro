import type { Option } from '../exercise/exerciseOptions';

interface SegmentedFieldProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A labelled row of exclusive choices, e.g. Kind: Weights | Bodyweight | Timed. */
export function SegmentedField<T extends string>({ label, options, value, onChange }: SegmentedFieldProps<T>) {
  return (
    <div class="segmented-field" role="group" aria-label={label}>
      <span class="field-caption">{label}</span>
      <div class="segmented">
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
