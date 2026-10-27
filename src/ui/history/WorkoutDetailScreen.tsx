import { useState } from 'preact/hooks';
import { deleteWorkout } from '../../store';
import type { Exercise, WorkoutSet } from '../../store';
import { BackLink } from '../components/BackLink';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { EditSetSheet } from '../exercise/EditSetSheet';
import { reportError } from '../errors';
import { formatDuration, formatTime, formatWeekdayDate } from '../format';
import { navigate } from '../router';
import { useLoad } from '../useLoad';
import { DetailExerciseBlock } from './DetailExerciseBlock';
import { EditWorkoutSheet } from './EditWorkoutSheet';
import { countWorking, deleteWorkoutMessage, loadWorkoutDetail, MISSING_WORKOUT } from './historyData';

const HISTORY_HASH = '#/history';

export function WorkoutDetailScreen({ workoutId }: { workoutId: string }) {
  const detail = useLoad('loading a past workout', "Couldn't load this workout.", () => loadWorkoutDetail(workoutId), [workoutId]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editing, setEditing] = useState<{ set: WorkoutSet; exercise: Exercise } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const removeWorkout = async () => {
    setConfirmingDelete(false);
    try {
      await deleteWorkout(workoutId);
      navigate(HISTORY_HASH);
    } catch (error) {
      setDeleteError(reportError('deleting a workout', error, "Couldn't delete the workout. Try again."));
    }
  };

  const data = detail.data === MISSING_WORKOUT ? null : detail.data;
  const allSets = data?.exercises.flatMap(({ sets }) => sets) ?? [];

  return (
    <main class="screen">
      <header class="top detail-top">
        <BackLink to={HISTORY_HASH} label="History" />
        {data && (
          <button type="button" class="card-menu-button" aria-label="Workout menu" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name="more" />
          </button>
        )}
        {menuOpen && (
          <div class="card-menu detail-menu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditingDetails(true);
              }}
            >
              Edit date and note
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmingDelete(true);
              }}
            >
              Delete workout
            </button>
          </div>
        )}
      </header>
      {detail.error && <ErrorNotice message={detail.error} onRetry={detail.reload} />}
      {deleteError && <ErrorNotice message={deleteError} />}
      {detail.data === MISSING_WORKOUT && <p class="hint">This workout isn't in your history any more.</p>}
      {data && (
        <>
          <p class="eyebrow history-when">
            {formatWeekdayDate(data.workout.startedAt)} · {formatTime(data.workout.startedAt).toLowerCase()}
          </p>
          <h1 class="h1">{data.title}</h1>
          {data.workout.note && <p class="exercise-note workout-note">{data.workout.note}</p>}
          <div class="detail-stats">
            <div class="stat">
              <div class="stat-key">Time</div>
              <div class="detail-stat-value">{formatDuration((data.workout.finishedAt ?? data.workout.startedAt) - data.workout.startedAt)}</div>
            </div>
            <div class="stat">
              <div class="stat-key">Sets</div>
              <div class="detail-stat-value">{countWorking(allSets)}</div>
            </div>
            <div class="stat">
              <div class="stat-key">Exercises</div>
              <div class="detail-stat-value">{data.exercises.length}</div>
            </div>
          </div>
          {data.exercises.length === 0 && <p class="hint">No sets were logged in this workout.</p>}
          {data.exercises.map((item) => (
            <DetailExerciseBlock key={item.entry.id} item={item} onEditSet={(set, exercise) => setEditing({ set, exercise })} />
          ))}
        </>
      )}
      {editing && (
        <EditSetSheet
          set={editing.set}
          exercise={editing.exercise}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            detail.reload();
          }}
        />
      )}
      {editingDetails && data && (
        <EditWorkoutSheet
          workout={data.workout}
          onClose={() => setEditingDetails(false)}
          onSaved={() => {
            setEditingDetails(false);
            detail.reload();
          }}
        />
      )}
      {confirmingDelete && data && (
        <ConfirmSheet
          title="Delete this workout?"
          message={deleteWorkoutMessage(data.title, data.workout.startedAt, allSets.length)}
          confirmLabel="Delete workout"
          destructive
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={removeWorkout}
        />
      )}
    </main>
  );
}
