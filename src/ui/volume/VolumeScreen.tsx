import { useState } from 'preact/hooks';
import { MUSCLES, MUSCLE_LABELS, muscleGaps, targetFor, zoneFor, type Muscle, type TargetScale, type VolumeZone } from '../../engine';
import { BackLink } from '../components/BackLink';
import { ErrorNotice } from '../components/ErrorNotice';
import { Icon } from '../components/Icon';
import { formatShortDate } from '../format';
import { useSettings } from '../settings/settings';
import { useLoad } from '../useLoad';
import { loadWeeklyVolume, weekRange } from './volumeData';

const ZONE_TEXT: Record<VolumeZone, string> = {
  below: 'Under target',
  building: 'Building',
  target: 'On target',
  above: 'Above target',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const setsText = (sets: number) => `${Number.isInteger(sets) ? sets : sets.toFixed(1)} ${sets === 1 ? 'set' : 'sets'}`;

function MuscleRow({ muscle, sets, days, scale }: { muscle: Muscle; sets: number; days: number; scale: TargetScale }) {
  const { low, high } = targetFor(muscle, scale);
  const zone = zoneFor(muscle, sets, scale);
  const barMax = Math.max(high * 1.25, sets);
  return (
    <div class={`volume-row zone-${zone}`}>
      <div class="volume-head">
        <span class="volume-name">{MUSCLE_LABELS[muscle]}</span>
        <span class="volume-sets">{setsText(sets)}</span>
      </div>
      <div class="volume-bar" role="img" aria-label={`${MUSCLE_LABELS[muscle]}: ${setsText(sets)}, target ${low} to ${high}`}>
        <div class="volume-band" style={{ left: `${(low / barMax) * 100}%`, width: `${((high - low) / barMax) * 100}%` }} />
        <div class="volume-fill" style={{ width: `${(sets / barMax) * 100}%` }} />
      </div>
      <div class="volume-foot">
        <span>
          Target {low} to {high}
        </span>
        <span>
          {ZONE_TEXT[zone]} · {days} {days === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  );
}

/** Every muscle, those furthest below the low end of their range first; muscles in range keep the body order below them. */
function furthestBehindFirst(byMuscle: Record<Muscle, { sets: number }>, scale: TargetScale): Muscle[] {
  const missing = (muscle: Muscle) => targetFor(muscle, scale).low - byMuscle[muscle].sets;
  return [...MUSCLES].sort((a, b) => missing(b) - missing(a));
}

/** One line naming the three biggest gaps, so the week's priority is clear before reading twelve rows. */
function BehindLine({ byMuscle, scale }: { byMuscle: Record<Muscle, { sets: number; days: number }>; scale: TargetScale }) {
  const gaps = muscleGaps(byMuscle, scale).slice(0, 3);
  if (gaps.length === 0) return <p class="volume-behind done">Every muscle has reached its range.</p>;
  return (
    <p class="volume-behind">
      Furthest behind: {gaps.map((gap) => `${MUSCLE_LABELS[gap.muscle]} ${Math.ceil(gap.missing)}${gap === gaps[0] ? ' to go' : ''}`).join(' · ')}
    </p>
  );
}

/** Working sets per muscle for a week against a guideline range, so gaps and overload are easy to see. */
export function VolumeScreen() {
  const { volumeTargets, weekStartsOn } = useSettings();
  const [weeksAgo, setWeeksAgo] = useState(0);
  const volume = useLoad('loading weekly volume', "Couldn't load your weekly volume.", () => loadWeeklyVolume(weeksAgo), [weeksAgo]);
  const { start, end } = weekRange(weeksAgo, Date.now());

  return (
    <main class="screen">
      <BackLink to="#/history" label="History" />
      <h1 class="h1 library-title">Weekly volume</h1>
      <div class="segmented" role="group" aria-label="Week">
        {['This week', 'Last week'].map((label, index) => (
          <button key={label} type="button" aria-pressed={weeksAgo === index} onClick={() => setWeeksAgo(index)}>
            {label}
          </button>
        ))}
      </div>
      <p class="hint volume-range">
        {formatShortDate(start)} to {formatShortDate(end - DAY_MS)}
        {weeksAgo === 0 && ': totals grow as you train'}
      </p>
      {volume.error && <ErrorNotice message={volume.error} onRetry={volume.reload} />}
      {volume.data && volume.data.unassignedSets > 0 && (
        <a class="notice volume-unassigned" href="#/library">
          <Icon name="search" />
          <span>{setsText(volume.data.unassignedSets)} from exercises with no muscle set are not counted. Pick one in Library.</span>
        </a>
      )}
      {volume.data && <BehindLine byMuscle={volume.data.byMuscle} scale={volumeTargets} />}
      {volume.data &&
        furthestBehindFirst(volume.data.byMuscle, volumeTargets).map((muscle) => (
          <MuscleRow key={muscle} muscle={muscle} scale={volumeTargets} {...volume.data!.byMuscle[muscle]} />
        ))}
      <p class="hint volume-note">
        Counts working sets from {weekStartsOn === 'sunday' ? 'Sunday to Saturday' : 'Monday to Sunday'}, not warm-ups. A set also counts half for the muscles it helps, like triceps
        on a bench press. The ranges are guidelines for building muscle: studies start to show better growth from about 10 hard
        sets per muscle a week, and going past the top of the range is hard to recover from. Needs vary, and effort is not
        tracked, so every working set is treated as hard.
      </p>
    </main>
  );
}
