export type ExerciseKind = 'weighted' | 'bodyweight' | 'timed';
export type ExerciseCategory = 'heavy' | 'compound' | 'isolation';
export type SetStyle = 'straight' | 'ramping';

export interface StoredRecord {
  id: string;
  updatedAt: number;
  deleted: boolean;
}

export interface Exercise extends StoredRecord {
  name: string;
  nameKey: string;
  kind: ExerciseKind;
  category: ExerciseCategory;
  repMin: number;
  repMax: number;
  weightStepLb: number;
  setStyle: SetStyle;
  warmupSets: number;
  restSeconds: number;
  mergedInto: string | null;
  seed: boolean;
  /** Form cues shown while logging. Absent on data from before schema version 2. */
  notes?: string;
  favorite?: boolean;
  /** Hidden from the Library list and pickers, but still named on past workouts. */
  archived?: boolean;
}

export interface DayType extends StoredRecord {
  name: string;
  order: number;
  exerciseIds: string[];
  mainLiftIds: string[];
  seed: boolean;
}

export interface Workout extends StoredRecord {
  dayTypeId: string | null;
  startedAt: number;
  finishedAt: number | null;
  /** Absent on data from before schema version 2. */
  note?: string;
}

export interface WorkoutExercise extends StoredRecord {
  workoutId: string;
  exerciseId: string;
  order: number;
  isMainLift: boolean;
  note: string;
}

export interface WorkoutSet extends StoredRecord {
  workoutId: string;
  workoutExerciseId: string;
  exerciseId: string;
  order: number;
  isWarmup: boolean;
  reps: number | null;
  weightLb: number | null;
  seconds: number | null;
  savedAt: number;
}

export interface Bodyweight extends StoredRecord {
  measuredAt: number;
  weightLb: number;
}

export type PersistentStorageStatus = 'granted' | 'denied' | 'unsupported';

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface OutboxRow {
  seq?: number;
  table: DataTableName;
  id: string;
  updatedAt: number;
}

export interface DataTables {
  exercises: Exercise;
  dayTypes: DayType;
  workouts: Workout;
  workoutExercises: WorkoutExercise;
  sets: WorkoutSet;
  bodyweights: Bodyweight;
}

export type DataTableName = keyof DataTables;

export const DATA_TABLE_NAMES: readonly DataTableName[] = [
  'exercises',
  'dayTypes',
  'workouts',
  'workoutExercises',
  'sets',
  'bodyweights',
];

export const SCHEMA_VERSION = 2;
