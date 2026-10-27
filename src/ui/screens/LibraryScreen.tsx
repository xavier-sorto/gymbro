import { useState } from 'preact/hooks';
import type { Exercise } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { SearchField } from '../components/SearchField';
import { loadLibrary } from '../data/libraryData';
import { categoryLabel, kindLabel } from '../exercise/exerciseOptions';
import { arrangeExercises, groupLabel } from '../exercise/arrangeExercises';
import { filterExercisesByName } from '../exercise/filterExercises';
import { libraryExerciseHash } from '../router';
import { useLoad } from '../useLoad';

const BACKUP_AND_DATA_HASH = '#/library/data';
const DAY_TYPES_HASH = '#/days';
const RECORDS_HASH = '#/records';
const PLATES_HASH = '#/plates';
const BODYWEIGHT_HASH = '#/bodyweight';

function ExerciseRow({ exercise, isMainLift }: { exercise: Exercise; isMainLift: boolean }) {
  return (
    <a class="library-row" href={libraryExerciseHash(exercise.id)}>
      <div class="library-row-text">
        <div class="library-row-name">
          {exercise.name}
          {isMainLift && (
            <span class="star" role="img" aria-label="Main lift">
              {' ★'}
            </span>
          )}
        </div>
        <div class="card-sub">
          {kindLabel(exercise.kind)} · {categoryLabel(exercise.category)}
        </div>
      </div>
      <Icon name="chevronRight" />
    </a>
  );
}

export function LibraryScreen() {
  const library = useLoad('loading the library', "Couldn't load your exercises.", loadLibrary, []);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const everything = library.data?.exercises ?? [];
  const archivedCount = everything.filter((exercise) => exercise.archived).length;
  const shown = filterExercisesByName(arrangeExercises(everything, showArchived), query);

  return (
    <main class="screen">
      <h1 class="h1 library-title">Library</h1>
      <SearchField value={query} onChange={setQuery} />
      {library.error && <ErrorNotice message={library.error} onRetry={library.reload} />}
      {library.data && shown.length === 0 && (
        <p class="hint">{query.trim() ? `No exercises match "${query.trim()}".` : 'No exercises yet.'}</p>
      )}
      {shown.map((exercise, index) => (
        <div key={exercise.id}>
          {groupLabel(exercise) !== (shown[index - 1] && groupLabel(shown[index - 1] as Exercise)) && (
            <div class="library-letter">{groupLabel(exercise)}</div>
          )}
          <ExerciseRow exercise={exercise} isMainLift={library.data?.mainLiftIds.has(exercise.id) ?? false} />
        </div>
      ))}
      {archivedCount > 0 && (
        <button type="button" class="link-button" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
        </button>
      )}
      <a class="link-row library-link" href={RECORDS_HASH}>
        <span>Personal records</span>
        <Icon name="chevronRight" />
      </a>
      <a class="link-row" href={BODYWEIGHT_HASH}>
        <span>Bodyweight</span>
        <Icon name="chevronRight" />
      </a>
      <a class="link-row" href={PLATES_HASH}>
        <span>Plate calculator</span>
        <Icon name="chevronRight" />
      </a>
      <a class="link-row" href={DAY_TYPES_HASH}>
        <span>Day types</span>
        <Icon name="chevronRight" />
      </a>
      <a class="link-row" href="#/settings">
        <span>Settings</span>
        <Icon name="chevronRight" />
      </a>
      <a class="link-row" href={BACKUP_AND_DATA_HASH}>
        <span>Backup &amp; data</span>
        <Icon name="chevronRight" />
      </a>
    </main>
  );
}
