import { useState } from 'preact/hooks';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../store';
import { pluralSets } from '../format';

interface ExerciseCardProps {
  entry: WorkoutExercise;
  exercise: Exercise | undefined;
  sets: WorkoutSet[];
  onOpen: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}

function setsSummary(sets: WorkoutSet[]): string {
  const warmups = sets.filter((set) => set.isWarmup).length;
  const working = sets.length - warmups;
  if (sets.length === 0) return 'No sets yet';
  return warmups > 0 ? `${pluralSets(working)}, ${warmups} warm-up` : pluralSets(working);
}

export function ExerciseCard({ entry, exercise, sets, onOpen, onMoveUp, onMoveDown, onRemove }: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const done = sets.some((set) => !set.isWarmup);
  const chooseMenuItem = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };
  return (
    <div class="card">
      <button type="button" class="card-main" onClick={onOpen}>
        <span class="card-title">
          {exercise?.name ?? 'Unknown exercise'}
          {entry.isMainLift && <span aria-label="main lift"> ★</span>}
        </span>
        <span class="card-sub">{setsSummary(sets)}</span>
        {done && <span class="tick" aria-label="done">✓</span>}
      </button>
      <button type="button" class="card-menu-button" aria-label="Exercise menu" onClick={() => setMenuOpen(!menuOpen)}>
        ⋯
      </button>
      {menuOpen && (
        <div class="card-menu">
          {onMoveUp && <button type="button" onClick={chooseMenuItem(onMoveUp)}>Move up</button>}
          {onMoveDown && <button type="button" onClick={chooseMenuItem(onMoveDown)}>Move down</button>}
          <button type="button" onClick={chooseMenuItem(onRemove)}>Remove</button>
        </div>
      )}
    </div>
  );
}
