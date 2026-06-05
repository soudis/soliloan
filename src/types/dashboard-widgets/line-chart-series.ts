import {
  createDefaultChartSeries,
  parseChartSeriesList,
  type ChartSeriesConfig,
} from './chart-series';

export const LINE_CHART_LINE_SHAPES = ['straight', 'smooth', 'stepped'] as const;

export type LineChartLineShape = (typeof LINE_CHART_LINE_SHAPES)[number];

export const LINE_CHART_DASH_STYLES = ['solid', 'dashed', 'dotted'] as const;

export type LineChartDashStyle = (typeof LINE_CHART_DASH_STYLES)[number];

export const LINE_CHART_LINE_WIDTH_MIN = 1;
export const LINE_CHART_LINE_WIDTH_MAX = 6;
export const LINE_CHART_LINE_WIDTH_DEFAULT = 2;
export const LINE_CHART_FILL_OPACITY = 0.2;
export const LINE_CHART_POINT_RADIUS = 4;

export type LineChartSeriesStyle = {
  filled: boolean;
  lineShape: LineChartLineShape;
  showPoints: boolean;
  lineWidth: number;
  dashStyle: LineChartDashStyle;
};

export type LineChartSeriesConfig = ChartSeriesConfig & LineChartSeriesStyle;

export function createDefaultLineChartSeriesStyle(): LineChartSeriesStyle {
  return {
    filled: false,
    lineShape: 'straight',
    showPoints: true,
    lineWidth: LINE_CHART_LINE_WIDTH_DEFAULT,
    dashStyle: 'solid',
  };
}

export function createDefaultLineChartSeries(
  overrides?: Partial<Pick<ChartSeriesConfig, 'metric' | 'aggregation'>>,
): LineChartSeriesConfig {
  return {
    ...createDefaultChartSeries(overrides),
    ...createDefaultLineChartSeriesStyle(),
  };
}

function parseLineChartSeriesStyle(raw: Record<string, unknown>): LineChartSeriesStyle {
  const defaults = createDefaultLineChartSeriesStyle();
  const lineWidth = Number(raw.lineWidth);
  return {
    filled: raw.filled === true,
    lineShape: LINE_CHART_LINE_SHAPES.includes(raw.lineShape as LineChartLineShape)
      ? (raw.lineShape as LineChartLineShape)
      : defaults.lineShape,
    showPoints: raw.showPoints !== false,
    lineWidth:
      Number.isFinite(lineWidth) && lineWidth >= LINE_CHART_LINE_WIDTH_MIN && lineWidth <= LINE_CHART_LINE_WIDTH_MAX
        ? Math.round(lineWidth)
        : defaults.lineWidth,
    dashStyle: LINE_CHART_DASH_STYLES.includes(raw.dashStyle as LineChartDashStyle)
      ? (raw.dashStyle as LineChartDashStyle)
      : defaults.dashStyle,
  };
}

export function parseLineChartSeriesList(raw: unknown): LineChartSeriesConfig[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const baseSeries = parseChartSeriesList(raw);
  return raw.map((item, index) => {
    const base = baseSeries[index] ?? createDefaultLineChartSeries();
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      ...base,
      ...parseLineChartSeriesStyle(record),
    };
  });
}
