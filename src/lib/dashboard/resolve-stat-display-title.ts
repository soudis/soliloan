import {
  createDefaultStatDeltaRange,
  type StatDeltaRange,
  type StatItemConfig,
} from '@/types/dashboard-widgets/stat-widget';

export function formatStatDeltaRangeLabel(
  range: StatDeltaRange,
  tStat: (key: string, values?: Record<string, string | number>) => string,
): string {
  return tStat(`deltaRangeLast.${range.unit}`, { amount: range.amount });
}

export function resolveStatDisplayTitle(
  stat: StatItemConfig,
  metricLabel: string,
  tStat: (key: string, values?: Record<string, string | number>) => string,
): string {
  const customTitle = stat.title.trim();
  if (customTitle.length > 0) {
    return customTitle;
  }
  if (stat.aggregation === 'average') {
    return tStat('defaultTitleWithAverage', { metric: metricLabel });
  }
  if (stat.aggregation === 'median') {
    return tStat('defaultTitleWithMedian', { metric: metricLabel });
  }
  if (stat.aggregation === 'averageByLender') {
    return tStat('defaultTitleWithAverageByLender', { metric: metricLabel });
  }
  if (stat.aggregation === 'medianByLender') {
    return tStat('defaultTitleWithMedianByLender', { metric: metricLabel });
  }
  if (stat.aggregation !== 'delta') {
    return metricLabel;
  }
  const range = stat.deltaRange ?? createDefaultStatDeltaRange();
  const rangeLabel = formatStatDeltaRangeLabel(range, tStat);
  return tStat('defaultTitleWithDelta', { metric: metricLabel, range: rangeLabel });
}
