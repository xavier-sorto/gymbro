import type { ExerciseKind, WorkoutSet } from '../../store';
import { formatSet } from '../format';

interface LoggedSetsProps {
  kind: ExerciseKind;
  sets: WorkoutSet[];
  onEdit: (set: WorkoutSet) => void;
}

export function LoggedSets({ kind, sets, onEdit }: LoggedSetsProps) {
  return (
    <ol class="logged-sets">
      {sets.map((set) => (
        <li key={set.id}>
          <button type="button" onClick={() => onEdit(set)}>
            {set.isWarmup && <span class="set-mark">W </span>}
            {formatSet(kind, set)}
          </button>
        </li>
      ))}
    </ol>
  );
}
