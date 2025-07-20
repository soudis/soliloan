export function convertEmptyToNull(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === '' ? null : value]));
}
