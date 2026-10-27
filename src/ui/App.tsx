import { useCallback, useEffect, useState } from 'preact/hooks';
import { getActiveWorkout, openStore } from '../store';
import type { Workout } from '../store';
import { AppContext } from './AppContext';
import { BottomBar } from './components/BottomBar';
import { reportError } from './errors';
import { ProgressChartScreen } from './progress-chart/ProgressChartScreen';
import { RecordsScreen } from './records/RecordsScreen';
import { RestTimerBar } from './rest/RestTimerBar';
import { navigate, needsActiveWorkout, parseRoute, useRoute, type Route } from './router';
import { AddExerciseScreen } from './screens/AddExerciseScreen';
import { DataScreen } from './screens/DataScreen';
import { DayTypeEditScreen } from './screens/DayTypeEditScreen';
import { DayTypesScreen } from './screens/DayTypesScreen';
import { ExerciseEditScreen } from './screens/ExerciseEditScreen';
import { ExerciseScreen } from './screens/ExerciseScreen';
import { HistoryScreen } from './history/HistoryScreen';
import { WorkoutDetailScreen } from './history/WorkoutDetailScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { LoadingScreen, StartupErrorScreen } from './screens/StartupScreen';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { useWakeLock } from './useWakeLock';

type Startup = { state: 'loading' } | { state: 'ready' } | { state: 'failed'; error: Error };

function ScreenFor({ route }: { route: Route }) {
  switch (route.name) {
    case 'workout':
      return <WorkoutScreen />;
    case 'exercise':
      return <ExerciseScreen key={route.workoutExerciseId} workoutExerciseId={route.workoutExerciseId} />;
    case 'add':
      return <AddExerciseScreen />;
    case 'days':
      return <DayTypesScreen />;
    case 'day':
      return <DayTypeEditScreen key={route.dayTypeId} dayTypeId={route.dayTypeId} />;
    case 'history':
      return <HistoryScreen />;
    case 'historyDetail':
      return <WorkoutDetailScreen key={route.workoutId} workoutId={route.workoutId} />;
    case 'progress':
      return <ProgressChartScreen key={route.exerciseId} exerciseId={route.exerciseId} />;
    case 'records':
      return <RecordsScreen />;
    case 'data':
      return <DataScreen />;
    case 'library':
      return <LibraryScreen />;
    case 'libraryExercise':
      return <ExerciseEditScreen key={route.exerciseId} exerciseId={route.exerciseId} />;
    default:
      return <HomeScreen />;
  }
}

export function App() {
  const route = useRoute();
  const [startup, setStartup] = useState<Startup>({ state: 'loading' });
  const [active, setActive] = useState<Workout | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshActive = useCallback(async () => {
    try {
      setActive(await getActiveWorkout());
    } catch (error) {
      reportError('reading the active workout', error, "Couldn't check for a workout in progress.");
      throw error;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await openStore();
        const workout = await getActiveWorkout();
        setActive(workout);
        setStartup({ state: 'ready' });
        if (workout && parseRoute(window.location.hash).name === 'home') navigate('#/workout');
      } catch (error) {
        reportError('starting GymBro', error, '');
        setStartup({ state: 'failed', error: error instanceof Error ? error : new Error(String(error)) });
      }
    })();
  }, []);

  const ready = startup.state === 'ready';
  useWakeLock(ready && active !== null);

  useEffect(() => {
    if (ready && !active && needsActiveWorkout(route)) navigate('#/');
  }, [ready, active, route]);

  if (startup.state === 'loading') return <LoadingScreen />;
  if (startup.state === 'failed') return <StartupErrorScreen error={startup.error} />;

  return (
    <AppContext.Provider value={{ active, refreshActive, notice, setNotice }}>
      {needsActiveWorkout(route) && !active ? null : <ScreenFor route={route} />}
      {active && needsActiveWorkout(route) && <RestTimerBar />}
      <BottomBar route={route} />
    </AppContext.Provider>
  );
}
