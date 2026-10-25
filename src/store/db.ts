import Dexie, { type Table } from 'dexie';
import { StoreUnavailableError } from './errors';
import { SCHEMA_STEPS, type SchemaStep } from './schemaSteps';
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

  constructor(steps: SchemaStep[] = SCHEMA_STEPS) {
    super(DATABASE_NAME);
    for (const step of steps) {
      const version = this.version(step.version).stores(step.stores);
      if (step.upgrade) version.upgrade(step.upgrade);
    }
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
