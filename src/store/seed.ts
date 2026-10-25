import { getDb } from './db';
import { validateExerciseFields, withExerciseDefaults } from './exerciseRules';
import { newId } from './ids';
import { SEED_DAY_TYPES, SEED_EXERCISES, seedExerciseInput } from './seedData';
import { SCHEMA_VERSION, type DayType, type Exercise } from './types';
import { writeTransaction } from './write';

function buildSeedExercises(): Exercise[] {
  return SEED_EXERCISES.map((spec) => ({
    id: spec.id,
    ...validateExerciseFields(withExerciseDefaults(seedExerciseInput(spec))),
    mergedInto: null,
    seed: true,
    updatedAt: 0,
    deleted: false,
  }));
}

function buildSeedDayTypes(): DayType[] {
  return SEED_DAY_TYPES.map((spec, index) => ({
    ...spec,
    order: index + 1,
    seed: true,
    updatedAt: 0,
    deleted: false,
  }));
}

/** Writes the starter library, day types, deviceId and seededAt in one all-or-nothing transaction. */
export async function seedIfFirstLaunch(): Promise<void> {
  const db = getDb();
  if (await db.meta.get('seededAt')) return;
  const exercises = buildSeedExercises();
  const dayTypes = buildSeedDayTypes();
  await writeTransaction(['exercises', 'dayTypes', 'meta'], async (context) => {
    for (const exercise of exercises) await context.save('exercises', exercise);
    for (const dayType of dayTypes) await context.save('dayTypes', dayType);
    await db.meta.bulkPut([
      { key: 'schemaVersion', value: SCHEMA_VERSION },
      { key: 'deviceId', value: newId() },
      { key: 'lastBackupAt', value: null },
      { key: 'lastFileExportAt', value: null },
      { key: 'seededAt', value: Date.now() },
    ]);
  });
}
