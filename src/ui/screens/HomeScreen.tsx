import { listDayTypes, startWorkout } from '../../store';
import { useState } from 'preact/hooks';
import { useApp } from '../AppContext';
import { ErrorNotice } from '../components/ErrorNotice';
import { reportError } from '../errors';
import { formatTime } from '../format';
import { navigate } from '../router';
import { useLoad } from '../useLoad';
import { FinishWorkoutButton } from './FinishWorkoutButton';

export function HomeScreen() {
  const { active, notice, refreshActive } = useApp();
  const dayTypes = useLoad('listing day types', "Couldn't load your workouts.", listDayTypes, []);
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
      <h1>GymBro</h1>
      {notice && <p class="notice">{notice}</p>}
      {startError && <ErrorNotice message={startError} />}
      {dayTypes.error && <ErrorNotice message={dayTypes.error} onRetry={dayTypes.reload} />}
      {active ? (
        <section>
          <button type="button" class="primary-button" onClick={() => navigate('#/workout')}>
            Resume {activeDayName} (started {formatTime(active.startedAt)})
          </button>
          <FinishWorkoutButton variant="small" />
        </section>
      ) : (
        <section>
          <h2>Start workout</h2>
          {dayTypes.data?.map((dayType) => (
            <button key={dayType.id} type="button" class="big-button" onClick={() => start(dayType.id)}>
              {dayType.name}
            </button>
          ))}
          <button type="button" class="big-button secondary" onClick={() => start(null)}>
            Empty workout
          </button>
        </section>
      )}
    </main>
  );
}
