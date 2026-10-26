import { useState } from 'preact/hooks';
import { getDayType, listExercises, listSets, removeWorkoutExercise, updateWorkoutExercise } from '../../store';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../store';
import { useActiveWorkout } from '../AppContext';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { listWorkoutEntries } from '../data/workoutData';
import { reportError } from '../errors';
import { formatDuration } from '../format';
import { exerciseHash, navigate } from '../router';
import { useNow } from '../useNow';
import { useLoad } from '../useLoad';
import { ExerciseCard } from './ExerciseCard';
import { FinishWorkoutButton } from './FinishWorkoutButton';

interface WorkoutView {
  title: string;
  rows: { entry: WorkoutExercise; exercise: Exercise | undefined; sets: WorkoutSet[] }[];
}

async function loadWorkoutView(workoutId: string, dayTypeId: string | null): Promise<WorkoutView> {
  const [entries, exercises, dayType] = await Promise.all([
    listWorkoutEntries(workoutId),
    listExercises(),
    dayTypeId ? getDayType(dayTypeId) : Promise.resolve(null),
  ]);
  const rows = await Promise.all(
    entries.map(async (entry) => ({
      entry,
      exercise: exercises.find((e) => e.id === entry.exerciseId),
      sets: await listSets(entry.id),
    })),
  );
  return { title: dayType?.name ?? 'Workout', rows };
}

export function WorkoutScreen() {
  const workout = useActiveWorkout();
  const now = useNow(30000);
  const view = useLoad('loading the workout', "Couldn't load this workout.", () => loadWorkoutView(workout.id, workout.dayTypeId), [workout.id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<WorkoutExercise | null>(null);

  const run = async (what: string, action: () => Promise<unknown>) => {
    try {
      await action();
      setActionError(null);
      view.reload();
    } catch (error) {
      setActionError(reportError(what, error, "That didn't work. Try again."));
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const rows = view.data?.rows ?? [];
    const first = rows[index];
    const second = rows[index + direction];
    if (!first || !second) return;
    void run('moving an exercise', async () => {
      await updateWorkoutExercise(first.entry.id, { order: second.entry.order });
      await updateWorkoutExercise(second.entry.id, { order: first.entry.order });
    });
  };

  const rows = view.data?.rows ?? [];
  const removingSetCount = rows.find((row) => row.entry.id === removing?.id)?.sets.length ?? 0;

  const askRemove = (entry: WorkoutExercise, setCount: number) => {
    if (setCount === 0) void run('removing an exercise', () => removeWorkoutExercise(entry.id));
    else setRemoving(entry);
  };

  return (
    <main class="screen">
      <h1>
        {view.data?.title ?? 'Workout'} <span class="elapsed">{formatDuration(now - workout.startedAt)}</span>
      </h1>
      {view.error && <ErrorNotice message={view.error} onRetry={view.reload} />}
      {actionError && <ErrorNotice message={actionError} />}
      {view.data && rows.length === 0 && <p class="hint">Add your first exercise</p>}
      {rows.map(({ entry, exercise, sets }, index) => (
        <ExerciseCard
          key={entry.id}
          entry={entry}
          exercise={exercise}
          sets={sets}
          onOpen={() => navigate(exerciseHash(entry.id))}
          onMoveUp={index > 0 ? () => move(index, -1) : undefined}
          onMoveDown={index < rows.length - 1 ? () => move(index, 1) : undefined}
          onRemove={() => askRemove(entry, sets.length)}
        />
      ))}
      <button type="button" class="big-button secondary" onClick={() => navigate('#/workout/add')}>
        Add exercise
      </button>
      <FinishWorkoutButton variant="big" />
      {removing && (
        <ConfirmSheet
          title="Remove exercise"
          message={`This exercise has ${removingSetCount} logged sets. Remove it and its sets from this workout?`}
          confirmLabel="Remove"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const target = removing;
            setRemoving(null);
            void run('removing an exercise', () => removeWorkoutExercise(target.id));
          }}
        />
      )}
    </main>
  );
}
