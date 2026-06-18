/** Custom column/stat title; falls back to the metric label when empty. */
export function resolveMetricTitle(customTitle: string, metricLabel: string): string {
  const trimmed = customTitle.trim();
  return trimmed.length > 0 ? trimmed : metricLabel;
}
