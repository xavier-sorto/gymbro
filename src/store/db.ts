import Dexie, { type Table } from 'dexie';
import { StoreUnavailableError } from './errors';
import type { DayType, Exercise, MetaRow, OutboxRow, Workout, WorkoutExercise, WorkoutSet } from './types';

export const DATABASE_NAME = 'gymbro';

export class GymBroDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  dayTypes!: Table<DayType, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  sets!: Table<WorkoutSet, string>;
  meta!: Table<MetaRow, string>;
  outbox!: Table<OutboxRow, number>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      exercises: 'id, nameKey, updatedAt',
      dayTypes: 'id, updatedAt',
      workouts: 'id, startedAt, updatedAt',
      workoutExercises: 'id, workoutId, exerciseId, updatedAt',
      sets: 'id, workoutExerciseId, [exerciseId+savedAt], updatedAt',
      meta: 'key',
      outbox: '++seq, table',
    });
  }
}

let openDatabase: GymBroDatabase | null = null;

export function setOpenDatabase(db: GymBroDatabase): void {
  openDatabase = db;
}

export function getDb(): GymBroDatabase {
  if (!openDatabase) {
    throw new StoreUnavailableError({ cause: new Error('openStore() has not been called') });
  }
  return openDatabase;
}

export function closeStore(): void {
  openDatabase?.close();
  openDatabase = null;
}
