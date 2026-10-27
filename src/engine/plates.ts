/** Plates in a typical commercial gym, heaviest first. */
export const PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export interface PlateLoad {
  /** Plates for one side of the bar, heaviest first. */
  perSide: number[];
  /** What the loaded bar weighs. Less than the target when the target cannot be made exactly. */
  totalLb: number;
}

/** Reaches any multiple of 2.5 per side, though it can use a plate more than the fewest possible (60 is 45+10+5, not 35+25). */
export function platesFor(targetLb: number, barLb: number, plates: readonly number[] = PLATES_LB): PlateLoad {
  let left = Math.max(0, (targetLb - barLb) / 2);
  const perSide: number[] = [];
  for (const plate of plates) {
    while (left >= plate) {
      perSide.push(plate);
      left -= plate;
    }
  }
  return { perSide, totalLb: barLb + 2 * perSide.reduce((sum, plate) => sum + plate, 0) };
}
