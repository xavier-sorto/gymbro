import { useState } from 'preact/hooks';
import { ValidationError, addBodyweight, deleteBodyweight, listBodyweights } from '../../store';
import type { Bodyweight } from '../../store';
import { BackLink } from '../components/BackLink';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ErrorNotice } from '../components/ErrorNotice';
import { StepperField } from '../components/StepperField';
import { reportError } from '../errors';
import { formatChange, formatShortDate } from '../format';
import { useLoad } from '../useLoad';
import { changeOverThirtyDays } from './bodyweightStats';

export function BodyweightScreen() {
  const entries = useLoad('loading weigh-ins', "Couldn't load your weigh-ins.", listBodyweights, []);
  /** What the owner typed; null until they type, so the field starts at the latest weigh-in. */
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Bodyweight | null>(null);
  const list = entries.data ?? [];
  const latest = list[0];
  const weight = typed ?? (latest ? String(latest.weightLb) : '');
  const change = changeOverThirtyDays(list, Date.now());

  const add = async () => {
    try {
      await addBodyweight({ weightLb: Number(weight) });
      setTyped(null);
      setError(null);
      entries.reload();
    } catch (failure) {
      setError(
        failure instanceof ValidationError
          ? `Weight ${failure.reason}`
          : reportError('saving a weigh-in', failure, "Couldn't save the weigh-in. Try again."),
      );
    }
  };

  const remove = async (entry: Bodyweight) => {
    setDeleting(null);
    try {
      await deleteBodyweight(entry.id);
      entries.reload();
    } catch (failure) {
      setError(reportError('deleting a weigh-in', failure, "Couldn't delete the weigh-in. Try again."));
    }
  };

  return (
    <main class="screen">
      <BackLink to="#/library" label="Library" />
      <h1 class="h1 library-title">Bodyweight</h1>
      {entries.error && <ErrorNotice message={entries.error} onRetry={entries.reload} />}
      {latest && (
        <div class="detail-stats bodyweight-stats">
          <div class="stat">
            <div class="stat-key">Latest</div>
            <div class="detail-stat-value">{latest.weightLb} lb</div>
          </div>
          <div class="stat">
            <div class="stat-key">30 days</div>
            <div class="detail-stat-value">{change === null ? 'None yet' : formatChange({ value: change, unit: 'lb' })}</div>
          </div>
        </div>
      )}
      <StepperField label="Weight (lb)" value={weight} step={0.5} decimal onChange={setTyped} />
      {error && <p class="field-error">{error}</p>}
      <button type="button" class="primary-button" onClick={add}>
        Add weigh-in
      </button>
      {entries.data?.length === 0 && <p class="hint">Your weigh-ins will show up here.</p>}
      {list.map((entry) => (
        <div key={entry.id} class="library-row">
          <div class="library-row-text">
            <div class="library-row-name">{entry.weightLb} lb</div>
            <div class="card-sub">{formatShortDate(entry.measuredAt)}</div>
          </div>
          <button type="button" class="history-delete" aria-label={`Delete ${entry.weightLb} lb weigh-in`} onClick={() => setDeleting(entry)}>
            Delete
          </button>
        </div>
      ))}
      {deleting && (
        <ConfirmSheet
          title="Delete this weigh-in?"
          message={`${deleting.weightLb} lb on ${formatShortDate(deleting.measuredAt)} will be removed.`}
          confirmLabel="Delete weigh-in"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </main>
  );
}
