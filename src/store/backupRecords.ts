import { ImportError, ValidationError } from './errors';
import { validatedBodyweight } from './bodyweights';
import { validateExerciseFields } from './exerciseRules';
import { validateSetValues } from './setRules';
import type { BackupData } from './backupFormat';
import { DATA_TABLE_NAMES, type DataTableName, type Exercise, type ExerciseKind } from './types';
import { requireIntegerInRange, requireTrimmedText } from './validatePrimitives';

type Raw = Record<string, unknown>;

function requireBoolean(field: string, value: unknown): void {
  if (typeof value !== 'boolean') throw new ValidationError(field, 'must be true or false');
}

function requireNumber(field: string, value: unknown): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(field, 'must be a number');
}

function requireText(field: string, value: unknown): string {
  if (typeof value !== 'string' || value === '') throw new ValidationError(field, 'must be text');
  return value;
}

function requireNullableNumber(field: string, value: unknown): void {
  if (value !== null) requireNumber(field, value);
}

function requireTextList(field: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new ValidationError(field, 'must be a list of text');
  }
  return value as string[];
}

function checkExercise(record: Raw): void {
  const cleaned = validateExerciseFields(record as unknown as Exercise);
  if (record.nameKey !== cleaned.nameKey) throw new ValidationError('nameKey', 'does not match name');
  if (record.mergedInto !== null) requireText('mergedInto', record.mergedInto);
  requireBoolean('seed', record.seed);
  if (record.notes !== undefined) requireTrimmedText('notes', record.notes, 0, 500);
  for (const flag of ['favorite', 'archived']) if (record[flag] !== undefined) requireBoolean(flag, record[flag]);
}

function checkDayType(record: Raw): void {
  requireTrimmedText('name', record.name, 1, 40);
  requireIntegerInRange('order', record.order, 0, 10000);
  const exerciseIds = requireTextList('exerciseIds', record.exerciseIds);
  const mainLiftIds = requireTextList('mainLiftIds', record.mainLiftIds);
  if (mainLiftIds.some((id) => !exerciseIds.includes(id))) throw new ValidationError('mainLiftIds', 'must be in exerciseIds');
  requireBoolean('seed', record.seed);
}

function checkWorkout(record: Raw): void {
  if (record.dayTypeId !== null) requireText('dayTypeId', record.dayTypeId);
  requireNumber('startedAt', record.startedAt);
  requireNullableNumber('finishedAt', record.finishedAt);
  if (record.note !== undefined) requireTrimmedText('note', record.note, 0, 500);
}

function checkBodyweight(record: Raw): void {
  requireNumber('measuredAt', record.measuredAt);
  validatedBodyweight('weightLb', record.weightLb);
}

function checkWorkoutExercise(record: Raw): void {
  requireText('workoutId', record.workoutId);
  requireText('exerciseId', record.exerciseId);
  requireIntegerInRange('order', record.order, 1, 1000);
  requireBoolean('isMainLift', record.isMainLift);
  requireTrimmedText('note', record.note, 0, 500);
}

function checkSet(record: Raw, kinds: Map<string, ExerciseKind>): void {
  requireText('workoutId', record.workoutId);
  requireText('workoutExerciseId', record.workoutExerciseId);
  const kind = kinds.get(requireText('exerciseId', record.exerciseId));
  if (!kind) throw new ValidationError('exerciseId', 'refers to an exercise that is not in the backup');
  requireIntegerInRange('order', record.order, 1, 100000);
  requireNumber('savedAt', record.savedAt);
  validateSetValues(kind, record);
}

function checkCommonFields(record: Raw): void {
  requireText('id', record.id);
  requireNumber('updatedAt', record.updatedAt);
  requireBoolean('deleted', record.deleted);
}

function recordsOf(data: Raw, table: DataTableName): Raw[] {
  const records = data[table];
  if (!Array.isArray(records)) throw new ImportError('invalid-record', table);
  return records as Raw[];
}

/** Checks every record of every table; throws ImportError('invalid-record') naming the table and index. */
export function validateBackupData(data: unknown): BackupData {
  if (typeof data !== 'object' || data === null) throw new ImportError('invalid-record', 'data');
  const raw = data as Raw;
  const kinds = new Map<string, ExerciseKind>();
  const checks: Record<DataTableName, (record: Raw) => void> = {
    exercises: (record) => {
      checkExercise(record);
      kinds.set(record.id as string, record.kind as ExerciseKind);
    },
    dayTypes: checkDayType,
    workouts: checkWorkout,
    workoutExercises: checkWorkoutExercise,
    sets: (record) => checkSet(record, kinds),
    bodyweights: checkBodyweight,
  };
  for (const table of DATA_TABLE_NAMES) {
    recordsOf(raw, table).forEach((record, index) => {
      try {
        if (typeof record !== 'object' || record === null) throw new ValidationError('record', 'must be an object');
        checkCommonFields(record);
        checks[table](record);
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error;
        throw new ImportError('invalid-record', table, index, { cause: error });
      }
    });
  }
  return raw as unknown as BackupData;
}
