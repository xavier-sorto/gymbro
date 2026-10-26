import { csvLine } from './csv';
import { localDate, localTime } from './localTime';
import { readAllData } from './readAllData';

const UTF8_BOM = String.fromCharCode(0xfeff);
const HEADER = ['date', 'time', 'day_type', 'exercise', 'kind', 'set_number', 'warmup', 'reps', 'weight_lb', 'seconds', 'note'];

/** Every non-deleted set of a finished, non-deleted workout, oldest first, as a CSV Excel can open. */
export async function exportSetsCsv(): Promise<File> {
  const data = await readAllData();
  const dayTypes = new Map(data.dayTypes.map((dayType) => [dayType.id, dayType.name]));
  const exercises = new Map(data.exercises.map((exercise) => [exercise.id, exercise]));
  const workouts = new Map(data.workouts.map((workout) => [workout.id, workout]));
  const entries = new Map(data.workoutExercises.map((entry) => [entry.id, entry]));
  const isFinished = (workoutId: string) => {
    const workout = workouts.get(workoutId);
    return workout !== undefined && !workout.deleted && workout.finishedAt !== null;
  };

  const lines = data.sets
    .filter((set) => !set.deleted && isFinished(set.workoutId))
    .sort((a, b) => a.savedAt - b.savedAt || a.order - b.order)
    .map((set) => {
      const exercise = exercises.get(set.exerciseId);
      const dayTypeId = workouts.get(set.workoutId)?.dayTypeId;
      return csvLine([
        localDate(set.savedAt),
        localTime(set.savedAt),
        (dayTypeId && dayTypes.get(dayTypeId)) || '',
        exercise?.name ?? '',
        exercise?.kind ?? '',
        set.order,
        set.isWarmup ? 'yes' : 'no',
        set.reps,
        set.weightLb,
        set.seconds,
        entries.get(set.workoutExerciseId)?.note ?? '',
      ]);
    });

  const body = [csvLine(HEADER), ...lines].join('\r\n') + '\r\n';
  return new File([UTF8_BOM + body], `gymbro-sets-${localDate(Date.now())}.csv`, { type: 'text/csv' });
}
