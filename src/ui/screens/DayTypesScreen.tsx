import { listDayTypes } from '../../store';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { dayHash, navigate } from '../router';
import { useLoad } from '../useLoad';

export function DayTypesScreen() {
  const dayTypes = useLoad('listing day types', "Couldn't load your day types.", listDayTypes, []);
  return (
    <main class="screen">
      <BackLink to="#/" label="Home" />
      <h1 class="h1">Day types</h1>
      {dayTypes.error && <ErrorNotice message={dayTypes.error} onRetry={dayTypes.reload} />}
      {dayTypes.data?.map((dayType) => (
        <button key={dayType.id} type="button" class="list-row" onClick={() => navigate(dayHash(dayType.id))}>
          {dayType.name}
          <Icon name="chevronRight" />
        </button>
      ))}
    </main>
  );
}
