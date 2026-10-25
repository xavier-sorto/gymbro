import type { ExerciseInput } from './exerciseRules';
import { DEFAULT_REP_RANGE } from './exerciseRules';
import type { ExerciseCategory, ExerciseKind } from './types';

export interface SeedExerciseSpec {
  id: string;
  name: string;
  kind: ExerciseKind;
  category: ExerciseCategory;
  setStyle?: 'ramping';
}

const seedId = (slug: string) => `seed-ex-${slug}`;

const weighted = (slug: string, name: string, category: ExerciseCategory): SeedExerciseSpec => ({
  id: seedId(slug),
  name,
  kind: 'weighted',
  category,
});

export const SEED_EXERCISES: SeedExerciseSpec[] = [
  { ...weighted('db-bench', 'Dumbbell Bench Press', 'heavy'), setStyle: 'ramping' },
  weighted('overhead-press', 'Overhead Press', 'heavy'),
  weighted('barbell-row', 'Barbell Row', 'heavy'),
  weighted('back-squat', 'Back Squat', 'heavy'),
  weighted('incline-db-press', 'Incline Dumbbell Press', 'compound'),
  weighted('lat-pulldown', 'Lat Pulldown', 'compound'),
  weighted('seated-cable-row', 'Seated Cable Row', 'compound'),
  weighted('romanian-deadlift', 'Romanian Deadlift', 'compound'),
  weighted('leg-press', 'Leg Press', 'compound'),
  { id: seedId('pull-up'), name: 'Pull-Up', kind: 'bodyweight', category: 'compound' },
  { id: seedId('dips'), name: 'Dips', kind: 'bodyweight', category: 'compound' },
  { id: seedId('plank'), name: 'Plank', kind: 'timed', category: 'isolation' },
  weighted('lateral-raise', 'Lateral Raise', 'isolation'),
  weighted('triceps-pushdown', 'Triceps Pushdown', 'isolation'),
  weighted('overhead-triceps-extension', 'Overhead Triceps Extension', 'isolation'),
  weighted('barbell-curl', 'Barbell Curl', 'isolation'),
  weighted('hammer-curl', 'Hammer Curl', 'isolation'),
  weighted('wrist-curl', 'Wrist Curl', 'isolation'),
  weighted('leg-curl', 'Leg Curl', 'isolation'),
  weighted('leg-extension', 'Leg Extension', 'isolation'),
  weighted('standing-calf-raise', 'Standing Calf Raise', 'isolation'),
  weighted('cable-fly', 'Cable Fly', 'isolation'),
  weighted('rear-delt-fly', 'Rear Delt Fly', 'isolation'),
];

export function seedExerciseInput(spec: SeedExerciseSpec): ExerciseInput {
  const [repMin, repMax] = DEFAULT_REP_RANGE[spec.category];
  return {
    name: spec.name,
    kind: spec.kind,
    category: spec.category,
    repMin,
    repMax,
    weightStepLb: 5,
    setStyle: spec.setStyle ?? 'straight',
    warmupSets: 2,
    restSeconds: spec.category === 'isolation' ? 60 : 90,
  };
}

export interface SeedDayTypeSpec {
  id: string;
  name: string;
  exerciseIds: string[];
  mainLiftIds: string[];
}

function seedDayType(id: string, name: string, slugs: string[], mainSlug: string): SeedDayTypeSpec {
  return { id: `seed-day-${id}`, name, exerciseIds: slugs.map(seedId), mainLiftIds: [seedId(mainSlug)] };
}

export const SEED_DAY_TYPES: SeedDayTypeSpec[] = [
  seedDayType(
    'push',
    'Push',
    ['db-bench', 'overhead-press', 'incline-db-press', 'lateral-raise', 'triceps-pushdown', 'overhead-triceps-extension'],
    'db-bench',
  ),
  seedDayType(
    'pull',
    'Pull',
    ['barbell-row', 'pull-up', 'lat-pulldown', 'seated-cable-row', 'barbell-curl', 'hammer-curl', 'wrist-curl'],
    'barbell-row',
  ),
  seedDayType(
    'legs',
    'Legs',
    ['back-squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'leg-extension', 'standing-calf-raise'],
    'back-squat',
  ),
  seedDayType(
    'chest-back',
    'Chest & Back',
    ['db-bench', 'barbell-row', 'incline-db-press', 'lat-pulldown', 'cable-fly', 'seated-cable-row'],
    'db-bench',
  ),
  seedDayType(
    'shoulders-arms',
    'Shoulders & Arms',
    ['overhead-press', 'lateral-raise', 'rear-delt-fly', 'barbell-curl', 'triceps-pushdown', 'hammer-curl'],
    'overhead-press',
  ),
];
