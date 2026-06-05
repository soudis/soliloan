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

export function chartDataSnapshotKey<T extends ChartType>(data: ChartData<T>): string {
  return JSON.stringify({
    labels: data.labels,
    data: data.datasets.map((dataset) => dataset.data),
  });
}
