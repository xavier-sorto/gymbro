import { useState } from 'preact/hooks';
import { TARGET_SCALES } from '../../engine';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { SegmentedField } from '../components/SegmentedField';
import { StepperField } from '../components/StepperField';
import { reportError } from '../errors';
import {
  MAX_BAR_LB,
  MIN_BAR_LB,
  REMINDER_CHOICES,
  THEMES,
  WEEK_STARTS,
  updateSettings,
  useSettings,
  type AppSettings,
} from './settings';

const THEME_LABELS = { dark: 'Dark', light: 'Light', system: 'Match phone' } as const;
const WEEK_LABELS = { monday: 'Monday', sunday: 'Sunday' } as const;
const TARGET_LABELS = { lighter: 'Lighter', standard: 'Standard', higher: 'Higher' } as const;
const REMINDER_LABELS: Record<number, string> = { 0: 'Off', 14: '2 weeks', 30: 'Monthly', 60: '2 months' };
const options = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((value) => ({ value, label: labels[value] }));

/** Choices that change how the app looks and counts. Each one is saved and applied as soon as it is picked. */
export function SettingsScreen() {
  const settings = useSettings();
  const [error, setError] = useState<string | null>(null);
  const [barText, setBarText] = useState(String(settings.barLb));

  const save = async (patch: Partial<AppSettings>) => {
    try {
      await updateSettings(patch);
      setError(null);
    } catch (failure) {
      setError(reportError('saving a setting', failure, "Couldn't save that setting. Try again."));
    }
  };

  const changeBar = (text: string) => {
    setBarText(text);
    const bar = Number(text);
    if (text.trim() !== '' && bar >= MIN_BAR_LB && bar <= MAX_BAR_LB) void save({ barLb: bar });
  };

  return (
    <main class="screen">
      <BackLink to="#/library" label="Library" />
      <h1 class="h1 library-title">Settings</h1>
      {error && <ErrorNotice message={error} />}
      <div class="edit-form settings-form">
        <SegmentedField label="Theme" options={options(THEMES, THEME_LABELS)} value={settings.theme} onChange={(theme) => void save({ theme })} />
        <SegmentedField
          label="Week starts on"
          options={options(WEEK_STARTS, WEEK_LABELS)}
          value={settings.weekStartsOn}
          onChange={(weekStartsOn) => void save({ weekStartsOn })}
        />
        <SegmentedField
          label="Weekly volume targets"
          options={options(TARGET_SCALES, TARGET_LABELS)}
          value={settings.volumeTargets}
          onChange={(volumeTargets) => void save({ volumeTargets })}
        />
        <p class="hint settings-note">Lighter is a quarter fewer sets than standard and Higher a quarter more.</p>
        <SegmentedField
          label="Warm-up suggestions"
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          value={settings.warmupSuggestions ? 'on' : 'off'}
          onChange={(value) => void save({ warmupSuggestions: value === 'on' })}
        />
        <SegmentedField
          label="Backup reminder"
          options={REMINDER_CHOICES.map((days) => ({ value: String(days), label: REMINDER_LABELS[days]! }))}
          value={String(settings.backupReminderDays)}
          onChange={(days) => void save({ backupReminderDays: Number(days) })}
        />
        <StepperField label="Plate calculator bar (lb)" value={barText} step={5} decimal onChange={changeBar} />
      </div>
    </main>
  );
}
