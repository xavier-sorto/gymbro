import { useState } from 'preact/hooks';
import { getDayType, listExercises, updateDayType } from '../../store';
import type { DayType, Exercise } from '../../store';
import { ErrorNotice } from '../components/ErrorNotice';
import { appendExercise, moveExercise, removeExercise, toggleMainLift, type TemplateLists } from '../dayTypes/templateEdits';
import { reportError } from '../errors';
import { navigate } from '../router';
import { useLoad } from '../useLoad';
import { ExercisePicker } from './ExercisePicker';

async function loadTemplate(dayTypeId: string) {
  const [dayType, exercises] = await Promise.all([getDayType(dayTypeId), listExercises()]);
  return { dayType, exercises };
}

export function DayTypeEditScreen({ dayTypeId }: { dayTypeId: string }) {
  const template = useLoad('loading the day type', "Couldn't load this day type.", () => loadTemplate(dayTypeId), [dayTypeId]);
  /** What the owner typed in the name field; null until they type. */
  const [typedName, setTypedName] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dayType = template.data?.dayType;

  /** Saves a change and reloads; failures are shown and the screen keeps what is stored. */
  const save = async (what: string, patch: Partial<Pick<DayType, 'name' | 'exerciseIds' | 'mainLiftIds'>>) => {
    try {
      await updateDayType(dayTypeId, patch);
      setSaveError(null);
      template.reload();
    } catch (error) {
      setSaveError(reportError(what, error, "Couldn't save that change. Try again."));
    }
  };

  const edit = (what: string, change: (lists: TemplateLists) => TemplateLists) => {
    if (dayType) void save(what, change(dayType));
  };

  const nameOf = (id: string) => template.data?.exercises.find((exercise: Exercise) => exercise.id === id)?.name ?? 'Unknown exercise';

  const addToTemplate = async (exerciseId: string) => {
    const current = await getDayType(dayTypeId);
    await updateDayType(dayTypeId, appendExercise(current, exerciseId));
    setAdding(false);
    template.reload();
  };

  return (
    <main class="screen">
      <button type="button" class="link-button" onClick={() => navigate('#/days')}>
        ‹ Day types
      </button>
      {template.error && <ErrorNotice message={template.error} onRetry={template.reload} />}
      {saveError && <ErrorNotice message={saveError} />}
      {dayType && (
        <>
          <input
            type="text"
            aria-label="Day type name"
            value={typedName ?? dayType.name}
            onInput={(event) => setTypedName(event.currentTarget.value)}
            onChange={(event) => {
              const typed = event.currentTarget.value;
              if (typed !== dayType.name) void save('renaming the day type', { name: typed });
            }}
          />
          {dayType.exerciseIds.length === 0 && <p class="hint">Add your first exercise</p>}
          {dayType.exerciseIds.map((id, index) => (
            <div class="template-row" key={id}>
              <span>{nameOf(id)}</span>
              <button
                type="button"
                aria-label={`${nameOf(id)} main lift`}
                aria-pressed={dayType.mainLiftIds.includes(id)}
                onClick={() => edit('changing the main lift', (lists) => toggleMainLift(lists, id))}
              >
                {dayType.mainLiftIds.includes(id) ? '★' : '☆'}
              </button>
              <button type="button" aria-label={`Move ${nameOf(id)} up`} disabled={index === 0} onClick={() => edit('moving an exercise', (lists) => moveExercise(lists, index, -1))}>
                ↑
              </button>
              <button type="button" aria-label={`Move ${nameOf(id)} down`} disabled={index === dayType.exerciseIds.length - 1} onClick={() => edit('moving an exercise', (lists) => moveExercise(lists, index, 1))}>
                ↓
              </button>
              <button type="button" aria-label={`Remove ${nameOf(id)}`} onClick={() => edit('removing an exercise', (lists) => removeExercise(lists, id))}>
                ✕
              </button>
            </div>
          ))}
          {adding ? (
            <ExercisePicker
              onPick={addToTemplate}
              onCreated={(exercise) => addToTemplate(exercise.id)}
            />
          ) : (
            <button type="button" class="big-button secondary" onClick={() => setAdding(true)}>
              Add exercise
            </button>
          )}
        </>
      )}
    </main>
  );
}
