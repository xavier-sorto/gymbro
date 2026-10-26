import { beforeEach, describe, expect, it } from 'vitest';
import { addWorkoutExercise, exportSetsCsv, finishWorkout, openStore, saveSet, startWorkout, updateWorkoutExercise } from '../../src/store';
import { SEED_BENCH, SEED_PUSH, finishedWorkoutWith, workoutExercisesOf } from './helpers';

describe('exportSetsCsv', () => {
  beforeEach(async () => {
    await openStore();
  });

  it('starts with a BOM, lists columns in order, quotes notes and marks warm-ups', async () => {
    const workout = await startWorkout(SEED_PUSH);
    const [bench] = await workoutExercisesOf(workout.id);
    await updateWorkoutExercise(bench!.id, { note: 'felt "heavy", slow' });
    await saveSet({ workoutExerciseId: bench!.id, isWarmup: true, reps: 10, weightLb: 45 });
    await saveSet({ workoutExerciseId: bench!.id, isWarmup: false, reps: 8, weightLb: 60.5 });
    await finishWorkout(workout.id);

    const file = await exportSetsCsv();
    expect([...new Uint8Array(await file.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = (await file.text()).split('\r\n');
    expect(lines[0]).toBe('date,time,day_type,exercise,kind,set_number,warmup,reps,weight_lb,seconds,note');
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2},\d{2}:\d{2},Push,Dumbbell Bench Press,weighted,1,yes,10,45,,"felt ""heavy"", slow"$/);
    expect(lines[2]).toMatch(/,2,no,8,60\.5,,"felt ""heavy"", slow"$/);
    expect(lines).toHaveLength(4);
  });

  it('leaves out sets of unfinished workouts', async () => {
    await finishedWorkoutWith([SEED_BENCH]);
    const active = await startWorkout(null);
    const entry = await addWorkoutExercise(active.id, SEED_BENCH);
    await saveSet({ workoutExerciseId: entry.id, isWarmup: false, reps: 5, weightLb: 50 });
    const file = await exportSetsCsv();
    expect(file.type).toBe('text/csv');
    expect(file.name).toMatch(/^gymbro-sets-\d{4}-\d{2}-\d{2}\.csv$/);
    expect((await file.text()).trim().split('\r\n')).toHaveLength(2);
  });
});
