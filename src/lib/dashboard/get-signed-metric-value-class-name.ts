export function getSignedMetricValueClassName(
  value: number | null | undefined,
  colorCodeSign: boolean | undefined,
): string | undefined {
  if (!colorCodeSign || value === null || value === undefined || value === 0) {
    return undefined;
  }
  if (value > 0) {
    return 'text-green-600';
  }
  if (value < 0) {
    return 'text-red-600';
  }
  return undefined;
}
