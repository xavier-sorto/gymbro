import { Icon } from './Icon';

interface StepperFieldProps {
  label: string;
  /** The field's text; empty while the owner is typing. */
  value: string;
  step: number;
  decimal?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
}

/** Rounds away floating-point noise from steps such as 2.5. */
export function stepValue(value: string, delta: number): string {
  const current = Number(value) || 0;
  return String(Math.max(0, Math.round((current + delta) * 100) / 100));
}

export function StepperField({ label, value, step, decimal = false, error, onChange }: StepperFieldProps) {
  return (
    <div class="stepper-field">
      <label class="stepper-label">{label}</label>
      <div class="stepper-controls">
        <button type="button" aria-label={`${label} minus`} onClick={() => onChange(stepValue(value, -step))}>
          <Icon name="minus" />
        </button>
        <input
          type="text"
          aria-label={label}
          inputMode={decimal ? 'decimal' : 'numeric'}
          value={value}
          onInput={(event) => onChange((event.currentTarget as HTMLInputElement).value)}
        />
        <button type="button" aria-label={`${label} plus`} onClick={() => onChange(stepValue(value, step))}>
          <Icon name="plus" />
        </button>
      </div>
      {error && <p class="field-error">{error}</p>}
    </div>
  );
}
