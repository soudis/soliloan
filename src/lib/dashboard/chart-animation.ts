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

export function chartDataVisualSnapshotKey<T extends ChartType>(data: ChartData<T>): string {
  return JSON.stringify(
    data.datasets.map((dataset) => ({
      label: dataset.label,
      backgroundColor: dataset.backgroundColor,
      borderColor: dataset.borderColor,
      borderWidth: dataset.borderWidth,
      borderDash: dataset.borderDash,
      fill: dataset.fill,
      tension: dataset.tension,
      stepped: dataset.stepped,
      pointRadius: dataset.pointRadius,
      stack: dataset.stack,
    })),
  );
}

/** @deprecated Use chartDataValuesSnapshotKey — kept for callers that only care about values. */
export function chartDataSnapshotKey<T extends ChartType>(data: ChartData<T>): string {
  return chartDataValuesSnapshotKey(data);
}
