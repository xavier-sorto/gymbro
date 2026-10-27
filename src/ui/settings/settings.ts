import { useEffect, useState } from 'preact/hooks';
import { TARGET_SCALES, type TargetScale } from '../../engine';
import { getMeta, setMeta } from '../../store/meta';
import { setWeekStartsOn } from '../history/historyStats';

export const THEMES = ['dark', 'light', 'system'] as const;
export type Theme = (typeof THEMES)[number];
export const WEEK_STARTS = ['monday', 'sunday'] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];
/** Days after the last backup before Home nudges; 0 turns the reminder off. */
export const REMINDER_CHOICES = [0, 14, 30, 60] as const;

export interface AppSettings {
  theme: Theme;
  /** The empty bar in the plate calculator, in pounds. */
  barLb: number;
  weekStartsOn: WeekStart;
  volumeTargets: TargetScale;
  warmupSuggestions: boolean;
  backupReminderDays: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  barLb: 45,
  weekStartsOn: 'monday',
  volumeTargets: 'standard',
  warmupSuggestions: true,
  backupReminderDays: 30,
};

export const MIN_BAR_LB = 10;
export const MAX_BAR_LB = 100;
const KEY = 'settings';

let current: AppSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Anything stored or passed in that is missing or not one of the known values falls back to the default. */
export function sanitizeSettings(raw: unknown): AppSettings {
  const input = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const bar = input.barLb;
  return {
    theme: pick(input.theme, THEMES, DEFAULT_SETTINGS.theme),
    barLb: typeof bar === 'number' && bar >= MIN_BAR_LB && bar <= MAX_BAR_LB ? Math.round(bar * 2) / 2 : DEFAULT_SETTINGS.barLb,
    weekStartsOn: pick(input.weekStartsOn, WEEK_STARTS, DEFAULT_SETTINGS.weekStartsOn),
    volumeTargets: pick(input.volumeTargets, TARGET_SCALES, DEFAULT_SETTINGS.volumeTargets),
    warmupSuggestions: typeof input.warmupSuggestions === 'boolean' ? input.warmupSuggestions : DEFAULT_SETTINGS.warmupSuggestions,
    backupReminderDays: pick(input.backupReminderDays, REMINDER_CHOICES as readonly number[], DEFAULT_SETTINGS.backupReminderDays),
  };
}

let watchingSystemTheme = false;

/** Puts the theme on the page; "system" follows the phone and keeps following it while the app is open. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : null;
  document.documentElement.dataset.theme = theme === 'system' ? (media?.matches ? 'light' : 'dark') : theme;
  if (media && !watchingSystemTheme) {
    watchingSystemTheme = true;
    media.addEventListener?.('change', () => {
      if (current.theme === 'system') applyTheme('system');
    });
  }
}

function applyEffects(settings: AppSettings): void {
  applyTheme(settings.theme);
  setWeekStartsOn(settings.weekStartsOn === 'sunday' ? 0 : 1);
  listeners.forEach((listener) => listener());
}

/** The settings as last loaded or saved. Read this anywhere; use useSettings in a component to re-render on change. */
export const getSettings = (): AppSettings => current;

/** Reads the saved settings (defaults when none or unreadable) and applies them. Never throws. */
export async function loadSettings(): Promise<AppSettings> {
  try {
    current = sanitizeSettings(await getMeta(KEY));
  } catch (error) {
    console.error('GymBro: could not read settings; using the defaults', error);
    current = DEFAULT_SETTINGS;
  }
  applyEffects(current);
  return current;
}

/**
 * Applies a change at once, then saves it. Changing the in-memory copy first means two quick changes
 * build on each other instead of the second overwriting the first; a failed save puts the old one back.
 */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const previous = current;
  const next = sanitizeSettings({ ...current, ...patch });
  current = next;
  applyEffects(next);
  try {
    await setMeta(KEY, next);
  } catch (error) {
    if (current === next) {
      current = previous;
      applyEffects(previous);
    }
    throw error;
  }
  return next;
}

export function useSettings(): AppSettings {
  const [, refresh] = useState(0);
  const seen = current;
  useEffect(() => {
    const listener = () => refresh((count) => count + 1);
    listeners.add(listener);
    // Effects run a moment after the first draw, so catch a change made in between.
    if (current !== seen) listener();
    return () => void listeners.delete(listener);
  }, []);
  return current;
}
