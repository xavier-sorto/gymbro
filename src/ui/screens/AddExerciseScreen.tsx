import { addWorkoutExercise, getDayType, updateDayType } from '../../store';
import type { Exercise } from '../../store';
import { useActiveWorkout } from '../AppContext';
import { navigate } from '../router';
import { useLoad } from '../useLoad';
import { ExercisePicker } from './ExercisePicker';

export function AddExerciseScreen() {
  const workout = useActiveWorkout();
  const dayType = useLoad(
    'loading the day type',
    "Couldn't load the day type.",
    () => (workout.dayTypeId ? getDayType(workout.dayTypeId) : Promise.resolve(null)),
    [workout.dayTypeId],
  );

  const add = async (exerciseId: string) => {
    await addWorkoutExercise(workout.id, exerciseId);
    navigate('#/workout');
  };

  const addCreated = async (exercise: Exercise, alsoAdd: boolean) => {
    await addWorkoutExercise(workout.id, exercise.id);
    if (alsoAdd && dayType.data) {
      await updateDayType(dayType.data.id, { exerciseIds: [...dayType.data.exerciseIds, exercise.id] });
    }
    navigate('#/workout');
  };

  return (
    <main class="screen">
      <button type="button" class="link-button" onClick={() => navigate('#/workout')}>
        ‹ Workout
      </button>
      <h1>Add exercise</h1>
      <ExercisePicker onPick={add} onCreated={addCreated} alsoAddTo={dayType.data} />
    </main>
  );
}
