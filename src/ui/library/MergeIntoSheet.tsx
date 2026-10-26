import { useState } from 'preact/hooks';
import { listExercises, mergeExercises } from '../../store';
import type { Exercise } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { SearchField } from '../components/SearchField';
import { Sheet } from '../components/Sheet';
import { filterExercisesByName } from '../exercise/filterExercises';
import { reportError } from '../errors';
import { navigate } from '../router';
import { useLoad } from '../useLoad';

interface MergeIntoSheetProps {
  from: Exercise;
  setCount: number;
  /** Skips the picker, e.g. when a rename clashed with this exercise. */
  initialTarget?: Exercise | null;
  onClose: () => void;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Pick the exercise to merge into (never this one, a merged or a deleted one), then confirm with the set count. */
export function MergeIntoSheet({ from, setCount, initialTarget = null, onClose }: MergeIntoSheetProps) {
  const choices = useLoad('listing exercises to merge into', "Couldn't load your exercises.", listExercises, []);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<Exercise | null>(initialTarget);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const candidates = filterExercisesByName((choices.data ?? []).filter((exercise) => exercise.id !== from.id), query);

  const merge = async () => {
    if (!target) return;
    setMerging(true);
    try {
      await mergeExercises(from.id, target.id);
      navigate('#/library');
    } catch (error) {
      setMergeError(reportError('merging exercises', error, "Couldn't merge the exercises. Nothing was changed. Try again."));
      setMerging(false);
    }
  };

  if (target) {
    return (
      <Sheet title="Merge exercises" onClose={onClose}>
        <p>
          {plural(setCount, 'set')} will move from {from.name} to {target.name}. {from.name} will then disappear from your
          library. This can't be undone.
        </p>
        {mergeError && <ErrorNotice message={mergeError} />}
        <button type="button" class="primary-button" disabled={merging} onClick={() => void merge()}>
          Merge into {target.name}
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Merge into another exercise" onClose={onClose}>
      <SearchField value={query} onChange={setQuery} autofocus />
      {choices.error && <ErrorNotice message={choices.error} onRetry={choices.reload} />}
      <ul class="exercise-choices">
        {candidates.map((exercise) => (
          <li key={exercise.id}>
            <button type="button" class="list-row" onClick={() => setTarget(exercise)}>
              {exercise.name}
            </button>
          </li>
        ))}
      </ul>
      {choices.data && candidates.length === 0 && <p class="hint">No other exercises to merge into.</p>}
    </Sheet>
  );
}
