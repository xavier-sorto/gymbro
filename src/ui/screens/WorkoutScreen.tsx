import { useState } from 'preact/hooks';
import { muscleGaps, musclesOf, type MuscleGap } from '../../engine';
import { getDayType, listExercises, listSets, removeWorkoutExercise, swapWorkoutExercise, updateWorkoutExercise } from '../../store';
import type { Exercise, WorkoutExercise, WorkoutSet } from '../../store';
import { useActiveWorkout } from '../AppContext';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { Sheet } from '../components/Sheet';
import { listWorkoutEntries } from '../data/workoutData';
import { reportError } from '../errors';
import { formatDuration } from '../format';
import { fractionOf } from '../progress';
import { exerciseHash, navigate } from '../router';
import { getSettings } from '../settings/settings';
import { NeedsStrip } from '../volume/NeedsStrip';
import { loadWeeklyVolume } from '../volume/volumeData';
import { useNow } from '../useNow';
import { useLoad } from '../useLoad';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';
import { FinishWorkoutButton } from './FinishWorkoutButton';

interface WorkoutView {
  title: string;
  rows: { entry: WorkoutExercise; exercise: Exercise | undefined; sets: WorkoutSet[] }[];
  /** Sets this week still needs for the muscles in this workout; empty if they could not be worked out. */
  needs: MuscleGap[];
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
  return { title: dayType?.name ?? 'Workout', rows, needs: await loadNeeds(rows.map((row) => row.exercise)) };
}

/** The weekly-volume gaps for the main muscles of these exercises, biggest first. Never fails the workout screen. */
async function loadNeeds(exercises: (Exercise | undefined)[]): Promise<MuscleGap[]> {
  try {
    const inWorkout = new Set(exercises.flatMap((exercise) => (exercise ? [musclesOf(exercise).primary] : [])));
    const volume = await loadWeeklyVolume(0);
    return muscleGaps(volume.byMuscle, getSettings().volumeTargets).filter((gap) => inWorkout.has(gap.muscle)).slice(0, 4);
  } catch (error) {
    console.error('GymBro: could not work out the weekly volume for this workout', error);
    return [];
  }
}

export function WorkoutScreen() {
  const workout = useActiveWorkout();
  const now = useNow(30000);
  const view = useLoad('loading the workout', "Couldn't load this workout.", () => loadWorkoutView(workout.id, workout.dayTypeId), [workout.id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<WorkoutExercise | null>(null);
  const [swapping, setSwapping] = useState<WorkoutExercise | null>(null);

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

  /** Throws on failure so the picker can show it. */
  const swap = async (exerciseId: string) => {
    if (!swapping) return;
    await swapWorkoutExercise(swapping.id, exerciseId);
    setSwapping(null);
    setActionError(null);
    view.reload();
  };

  const rows = view.data?.rows ?? [];
  const doneCount = rows.filter((row) => row.sets.some((set) => !set.isWarmup)).length;
  const removingSetCount = rows.find((row) => row.entry.id === removing?.id)?.sets.length ?? 0;

  const askRemove = (entry: WorkoutExercise, setCount: number) => {
    if (setCount === 0) void run('removing an exercise', () => removeWorkoutExercise(entry.id));
    else setRemoving(entry);
  };

  return (
    <main class="screen">
      <header class="top">
        <h1 class="h1">{view.data?.title ?? 'Workout'}</h1>
        <span class="pill elapsed">{formatDuration(now - workout.startedAt)}</span>
      </header>
      {rows.length > 0 && <ProgressBar label="Exercises done" fraction={fractionOf(doneCount, rows.length)} />}
      {view.data && <NeedsStrip needs={view.data.needs} />}
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
          onSwap={sets.length === 0 ? () => setSwapping(entry) : undefined}
          onRemove={() => askRemove(entry, sets.length)}
        />
      ))}
      <button type="button" class="big-button secondary add-exercise" onClick={() => navigate('#/workout/add')}>
        <Icon name="plus" />
        Add exercise
      </button>
      <FinishWorkoutButton variant="big" />
      {swapping && (
        <Sheet title="Swap exercise" onClose={() => setSwapping(null)}>
          <ExercisePicker onPick={swap} onCreated={(exercise) => swap(exercise.id)} />
        </Sheet>
      )}
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
