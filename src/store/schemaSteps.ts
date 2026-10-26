import type { Transaction } from 'dexie';

/** One schema version: its table definitions (only the changes after v1) and optional data upgrade. */
export interface SchemaStep {
  version: number;
  stores: Record<string, string | null>;
  upgrade?: (transaction: Transaction) => PromiseLike<unknown> | void;
}

/** Migrations are additive only: new tables, or new optional fields with defaults. */
export const SCHEMA_STEPS: SchemaStep[] = [
  {
    version: 1,
    stores: {
      exercises: 'id, nameKey, updatedAt',
      dayTypes: 'id, updatedAt',
      workouts: 'id, startedAt, updatedAt',
      workoutExercises: 'id, workoutId, exerciseId, updatedAt',
      sets: 'id, workoutExerciseId, [exerciseId+savedAt], updatedAt',
      meta: 'key',
      outbox: '++seq, table',
    },
  },
];

export function latestVersion(steps: SchemaStep[]): number {
  return Math.max(...steps.map((step) => step.version));
}
