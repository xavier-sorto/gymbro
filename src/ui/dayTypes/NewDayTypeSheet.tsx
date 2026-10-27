import { useState } from 'preact/hooks';
import { ValidationError, createDayType } from '../../store';
import type { DayType } from '../../store';
import { Sheet } from '../components/Sheet';
import { reportError } from '../errors';

export function NewDayTypeSheet({ onCreated, onClose }: { onCreated: (dayType: DayType) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    try {
      onCreated(await createDayType({ name }));
    } catch (failure) {
      setError(
        failure instanceof ValidationError
          ? `Name ${failure.reason}`
          : reportError('creating a day type', failure, "Couldn't create the day type. Try again."),
      );
    }
  };

  return (
    <Sheet title="New day type" onClose={onClose}>
      <input
        type="text"
        class="name-input"
        aria-label="New day type name"
        placeholder="For example: Arms"
        autofocus
        value={name}
        onInput={(event) => setName(event.currentTarget.value)}
      />
      {error && <p class="field-error">{error}</p>}
      <button type="button" class="primary-button" onClick={create}>
        Create day type
      </button>
    </Sheet>
  );
}
