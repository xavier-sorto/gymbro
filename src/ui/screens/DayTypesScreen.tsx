import { listDayTypes } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { dayHash, navigate } from '../router';
import { useLoad } from '../useLoad';

export function DayTypesScreen() {
  const dayTypes = useLoad('listing day types', "Couldn't load your day types.", listDayTypes, []);
  return (
    <main class="screen">
      <button type="button" class="link-button" onClick={() => navigate('#/')}>
        ‹ Home
      </button>
      <h1>Day types</h1>
      {dayTypes.error && <ErrorNotice message={dayTypes.error} onRetry={dayTypes.reload} />}
      {dayTypes.data?.map((dayType) => (
        <button key={dayType.id} type="button" class="big-button" onClick={() => navigate(dayHash(dayType.id))}>
          {dayType.name}
        </button>
      ))}
    </main>
  );
}
