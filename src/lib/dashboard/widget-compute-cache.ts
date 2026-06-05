export function buildWidgetComputeCacheKey(
  widgetType: string,
  config: Record<string, unknown> | undefined,
  loanCount: number,
  toDateMs: number,
): string {
  return `${widgetType}:${loanCount}:${toDateMs}:${JSON.stringify(config ?? {})}`;
}
