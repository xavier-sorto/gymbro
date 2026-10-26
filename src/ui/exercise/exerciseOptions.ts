import type { ExerciseCategory, ExerciseKind, SetStyle } from '../../store';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const KIND_OPTIONS: Option<ExerciseKind>[] = [
  { value: 'weighted', label: 'Weights' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'timed', label: 'Timed' },
];

export const CATEGORY_OPTIONS: Option<ExerciseCategory>[] = [
  { value: 'heavy', label: 'Heavy' },
  { value: 'compound', label: 'Compound' },
  { value: 'isolation', label: 'Isolation' },
];

export const SET_STYLE_OPTIONS: Option<SetStyle>[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'ramping', label: 'Ramping' },
];

export const kindLabel = (kind: ExerciseKind) => KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
export const categoryLabel = (category: ExerciseCategory) => CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
