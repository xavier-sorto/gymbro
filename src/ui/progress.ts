/** Share (0 to 1) of `total` that `part` makes up; 0 when there is nothing to measure. */
export function fractionOf(part: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(1, Math.max(0, part / total));
}

/** A CSS width such as "62%" for a progress bar. */
export function percentWidth(fraction: number): string {
  return `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
}
