import type { ChartData, ChartType } from 'chart.js';

export const DASHBOARD_CHART_ANIMATION = {
  duration: 750,
  easing: 'easeOutQuart' as const,
};

export function zeroChartData<T extends ChartType>(data: ChartData<T>): ChartData<T> {
  return {
    ...data,
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      data: Array.isArray(dataset.data) ? dataset.data.map(() => 0) : dataset.data,
    })),
  } as ChartData<T>;
}

export function chartDataValuesSnapshotKey<T extends ChartType>(data: ChartData<T>): string {
  return JSON.stringify({
    labels: data.labels,
    data: data.datasets.map((dataset) => dataset.data),
  });
}

type ChartDatasetVisualProps = {
  label?: unknown;
  backgroundColor?: unknown;
  borderColor?: unknown;
  borderWidth?: unknown;
  borderDash?: unknown;
  fill?: unknown;
  tension?: unknown;
  stepped?: unknown;
  pointRadius?: unknown;
  stack?: unknown;
};

export function chartDataVisualSnapshotKey<T extends ChartType>(data: ChartData<T>): string {
  return JSON.stringify(
    data.datasets.map((dataset) => {
      // Visual props are chart-type specific (e.g. fill/tension only exist on line
      // datasets), so read them loosely — this is only used to build a memo key.
      const d = dataset as ChartDatasetVisualProps;
      return {
        label: d.label,
        backgroundColor: d.backgroundColor,
        borderColor: d.borderColor,
        borderWidth: d.borderWidth,
        borderDash: d.borderDash,
        fill: d.fill,
        tension: d.tension,
        stepped: d.stepped,
        pointRadius: d.pointRadius,
        stack: d.stack,
      };
    }),
  );
}

/** @deprecated Use chartDataValuesSnapshotKey — kept for callers that only care about values. */
export function chartDataSnapshotKey<T extends ChartType>(data: ChartData<T>): string {
  return chartDataValuesSnapshotKey(data);
}
