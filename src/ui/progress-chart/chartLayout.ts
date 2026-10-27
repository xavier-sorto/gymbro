import type { ChartPoint } from './chartValues';

export const CHART_WIDTH = 340;
export const CHART_HEIGHT = 190;
const LEFT = 30;
const RIGHT = 332;
const TOP = 10;
const BOTTOM = 166;
const BAR_WIDTH = 16.5;
const BARS_MAX_SHARE = 0.55;

export interface Tick {
  y: number;
  label: string;
}
export interface PlottedPoint {
  x: number;
  lineY: number;
  barY: number | null;
  barHeight: number;
  startedAt: number;
}
export interface ChartLayout {
  ticks: Tick[];
  points: PlottedPoint[];
  barWidth: number;
  plotLeft: number;
  plotRight: number;
}

/** Axis bounds for the line: a little padding, and room when every value is equal. */
export function lineBounds(values: number[]): { min: number; max: number } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (low === high) return { min: Math.max(0, low - 1), max: high + 1 };
  const pad = (high - low) * 0.1;
  return { min: Math.max(0, low - pad), max: high + pad };
}

const roundLabel = (value: number) => String(Math.round(value * 10) / 10);

/** Where each point, bar and gridline goes in the 340 × 190 drawing. Points are spaced evenly, oldest left. */
export function layoutChart(points: readonly ChartPoint[]): ChartLayout {
  const { min, max } = lineBounds(points.map((point) => point.line));
  const plotHeight = BOTTOM - TOP;
  const yFor = (value: number) => BOTTOM - ((value - min) / (max - min)) * plotHeight;
  const maxBar = Math.max(0, ...points.map((point) => point.bar ?? 0));
  const slot = (RIGHT - LEFT) / points.length;
  return {
    ticks: [max, (min + max) / 2, min].map((value) => ({ y: yFor(value), label: roundLabel(value) })),
    barWidth: Math.min(BAR_WIDTH, slot * 0.6),
    plotLeft: LEFT,
    plotRight: RIGHT,
    points: points.map((point, index) => {
      const barHeight = point.bar && maxBar > 0 ? (point.bar / maxBar) * plotHeight * BARS_MAX_SHARE : 0;
      return {
        x: LEFT + slot * (index + 0.5),
        lineY: yFor(point.line),
        barY: point.bar === null ? null : BOTTOM - barHeight,
        barHeight,
        startedAt: point.startedAt,
      };
    }),
  };
}
