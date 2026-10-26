import { formatShortDate } from '../format';
import { CHART_HEIGHT, CHART_WIDTH, layoutChart } from './chartLayout';
import type { ChartPoint } from './chartValues';

/** First, middle and last point get a date label. */
const labelIndexes = (count: number) => [...new Set([0, Math.floor((count - 1) / 2), count - 1])];

export function ProgressChartSvg({ points, label }: { points: readonly ChartPoint[]; label: string }) {
  const layout = layoutChart(points);
  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={label}>
      {layout.ticks.map((tick) => (
        <g key={tick.y}>
          <line class="chart-grid" x1={layout.plotLeft} x2={layout.plotRight} y1={tick.y} y2={tick.y} />
          <text class="chart-axis" x={layout.plotLeft - 6} y={tick.y + 4} text-anchor="end">
            {tick.label}
          </text>
        </g>
      ))}
      {layout.points.map((point) =>
        point.barY === null ? null : (
          <rect key={point.startedAt} class="chart-bar" x={point.x - layout.barWidth / 2} y={point.barY} width={layout.barWidth} height={point.barHeight} rx="3" />
        ),
      )}
      <polyline class="chart-weight chart-line" points={layout.points.map((point) => `${point.x},${point.lineY}`).join(' ')} />
      {layout.points.map((point) => (
        <circle key={point.startedAt} class="chart-weight chart-dot" cx={point.x} cy={point.lineY} r="3.5" />
      ))}
      {labelIndexes(layout.points.length).map((index) => (
        <text key={index} class="chart-axis" x={layout.points[index].x} y="184" text-anchor="middle">
          {formatShortDate(layout.points[index].startedAt)}
        </text>
      ))}
    </svg>
  );
}
