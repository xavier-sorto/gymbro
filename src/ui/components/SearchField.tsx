import { Icon } from './Icon';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  autofocus?: boolean;
}

/** The "Search exercises" box used by the exercise picker and the Library. */
export function SearchField({ value, onChange, autofocus = false }: SearchFieldProps) {
  return (
    <div class="search">
      <Icon name="search" />
      <input
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises"
        autofocus={autofocus}
        value={value}
        onInput={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}
