import { listDayTypes, startWorkout } from '../../store';
import { useState } from 'preact/hooks';
import { useApp } from '../AppContext';
import { loadBackupDue } from '../data/backupReminder';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { reportError } from '../errors';
import { formatTime, formatWeekdayDate } from '../format';
import { SuggestionCard } from '../volume/SuggestionCard';
import { loadSuggestion } from '../volume/suggestion';
import { navigate } from '../router';
import { useLoad } from '../useLoad';
import { FinishWorkoutButton } from './FinishWorkoutButton';

export function HomeScreen() {
  const { active, notice, refreshActive } = useApp();
  const dayTypes = useLoad('listing day types', "Couldn't load your workouts.", listDayTypes, []);
  const suggestion = useLoad('working out what to train', '', loadSuggestion, []);
  const backupDue = useLoad('checking when you last backed up', '', loadBackupDue, []);
  const [startError, setStartError] = useState<string | null>(null);

  const start = async (dayTypeId: string | null) => {
    try {
      await startWorkout(dayTypeId);
      await refreshActive();
      navigate('#/workout');
    } catch (error) {
      setStartError(reportError('starting a workout', error, "Couldn't start the workout. Try again."));
    }
  };

  const activeDayName = dayTypes.data?.find((dayType) => dayType.id === active?.dayTypeId)?.name ?? 'workout';

  return (
    <main class="screen">
      <header class="top">
        <h1 class="wordmark">
          Gym<b>Bro</b>
        </h1>
        <span class="pill today-date">{formatWeekdayDate(Date.now())}</span>
      </header>
      {notice && (
        <p class="notice toast">
          <Icon name="check" />
          {notice}
        </p>
      )}
      {backupDue.data && (
        <a class="notice backup-reminder" href="#/library/data">
          <Icon name="arrowUp" />
          It has been a while since your last backup. Tap to back up.
        </a>
      )}
      {startError && <ErrorNotice message={startError} />}
      {!active && suggestion.data && <SuggestionCard suggestion={suggestion.data} onStart={start} />}
      {dayTypes.error && <ErrorNotice message={dayTypes.error} onRetry={dayTypes.reload} />}
      {active ? (
        <section class="resume">
          <p class="eyebrow">In progress</p>
          <p class="resume-name">{activeDayName}</p>
          <button type="button" class="primary-button" onClick={() => navigate('#/workout')}>
            Resume {activeDayName} (started {formatTime(active.startedAt)})
          </button>
          <FinishWorkoutButton variant="small" />
        </section>
      ) : (
        <section>
          <h2 class="section-title">Start workout</h2>
          <div class="days">
            {dayTypes.data?.map((dayType) => (
              <button key={dayType.id} type="button" class="day" onClick={() => start(dayType.id)}>
                <span class="glyph"><Icon name="dumbbell" /></span>
                <span class="go"><Icon name="chevronRight" /></span>
                <span class="name">{dayType.name}</span>
              </button>
            ))}
            <button type="button" class="day empty wide" onClick={() => start(null)}>
              <Icon name="plus" />
              <span class="name">Empty workout</span>
            </button>
          </div>
        </section>
      )}
      {!active && (
        <a class="link-row" href="#/days">
          Edit day types
          <Icon name="chevronRight" />
        </a>
      )}
      {!active && (
        <a class="link-row" href="#/settings">
          Settings
          <Icon name="chevronRight" />
        </a>
      )}
    </main>
  );
}
