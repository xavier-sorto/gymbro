import type { Exercise, WorkoutSet } from '../../store';
import { formatSet } from '../format';
import { progressHash } from '../router';
import type { DetailExercise } from './historyData';

interface DetailExerciseBlockProps {
  item: DetailExercise;
  onEditSet: (set: WorkoutSet, exercise: Exercise) => void;
}

export function DetailExerciseBlock({ item, onEditSet }: DetailExerciseBlockProps) {
  const { entry, exercise, sets } = item;
  const name = exercise?.name ?? 'Unknown exercise';
  return (
    <section class="exercise-block">
      <div class="exercise-block-head">
        {exercise ? (
          <a class="exercise-block-name" href={progressHash(exercise.id)}>
            {name}
            {entry.isMainLift && <span class="star" aria-label="main lift"> ★</span>}
          </a>
        ) : (
          <span class="exercise-block-name">{name}</span>
        )}
        {exercise && (
          <a class="exercise-block-progress" href={progressHash(exercise.id)}>
            Progress
          </a>
        )}
      </div>
      {sets.map((set, index) => (
        <button
          key={set.id}
          type="button"
          class="detail-set"
          disabled={!exercise}
          aria-label={`Edit set ${index + 1}`}
          onClick={() => exercise && onEditSet(set, exercise)}
        >
          <span class="detail-set-number">{index + 1}</span>
          <span class="detail-set-value">{exercise ? formatSet(exercise.kind, set) : ''}</span>
          {set.isWarmup && <span class="set-mark">W</span>}
        </button>
      ))}
      {entry.note && <p class="exercise-note">{entry.note}</p>}
    </section>
  );
}
