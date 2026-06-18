import {
  LINE_CHART_FILL_OPACITY,
  LINE_CHART_POINT_RADIUS,
  type LineChartDashStyle,
  type LineChartSeriesConfig,
} from '@/types/dashboard-widgets/line-chart-series';

import { chartColorWithAlpha } from './chart-dataset-colors';

const DASH_STYLE_VALUES: Record<LineChartDashStyle, number[]> = {
  solid: [],
  dashed: [8, 4],
  dotted: [2, 3],
};

export function resolveLineChartDatasetStyle(series: LineChartSeriesConfig, color: string) {
  const tension = series.lineShape === 'smooth' ? 0.35 : 0;
  const stepped = series.lineShape === 'stepped';

  return {
    borderColor: color,
    backgroundColor: chartColorWithAlpha(color, LINE_CHART_FILL_OPACITY),
    fill: series.filled,
    tension,
    stepped,
    borderWidth: series.lineWidth,
    borderDash: DASH_STYLE_VALUES[series.dashStyle],
    pointRadius: series.showPoints ? LINE_CHART_POINT_RADIUS : 0,
    pointHoverRadius: series.showPoints ? LINE_CHART_POINT_RADIUS + 1 : 0,
    pointBackgroundColor: color,
    pointBorderColor: color,
    spanGaps: false,
  };
}
