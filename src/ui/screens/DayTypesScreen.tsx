import { useState } from 'preact/hooks';
import { listDayTypes } from '../../store';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { NewDayTypeSheet } from '../dayTypes/NewDayTypeSheet';
import { dayHash, navigate } from '../router';
import { useLoad } from '../useLoad';

export function DayTypesScreen() {
  const dayTypes = useLoad('listing day types', "Couldn't load your day types.", listDayTypes, []);
  const [creating, setCreating] = useState(false);
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
      <button type="button" class="big-button secondary add-exercise" onClick={() => setCreating(true)}>
        <Icon name="plus" />
        New day type
      </button>
      {creating && (
        <NewDayTypeSheet
          onClose={() => setCreating(false)}
          onCreated={(dayType) => navigate(dayHash(dayType.id))}
        />
      )}
    </main>
  );
}
