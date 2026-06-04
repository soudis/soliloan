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
  if (stat.aggregation !== 'delta') {
    return metricLabel;
  }
  const range = stat.deltaRange ?? createDefaultStatDeltaRange();
  const rangeLabel = formatStatDeltaRangeLabel(range, tStat);
  return tStat('defaultTitleWithDelta', { metric: metricLabel, range: rangeLabel });
}
