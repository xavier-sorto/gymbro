import { MUSCLE_LABELS, type MuscleGap } from '../../engine';

/** In a workout: the sets this week still needs for the muscles this workout trains. */
export function NeedsStrip({ needs }: { needs: MuscleGap[] }) {
  if (needs.length === 0) return null;
  return (
    <a class="needs-strip" href="#/volume" aria-label="Sets still needed this week for the muscles in this workout">
      <span class="needs-label">Still needed this week</span>
      {needs.map((gap) => (
        <span class="needs-chip" key={gap.muscle}>
          {MUSCLE_LABELS[gap.muscle]} {Math.ceil(gap.missing)}
        </span>
      ))}
    </a>
  );
}
