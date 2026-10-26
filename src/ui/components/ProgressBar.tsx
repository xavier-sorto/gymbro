import { percentWidth } from '../progress';

/** A thin bar showing `fraction` (0 to 1) of the way done. */
export function ProgressBar({ fraction, label }: { fraction: number; label: string }) {
  return (
    <div class="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
      <i style={{ width: percentWidth(fraction) }} />
    </div>
  );
}
