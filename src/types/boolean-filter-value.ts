export type BooleanFilterValue = 'true' | 'false' | '';

export function parseBooleanFilterValue(raw: unknown): BooleanFilterValue {
  if (raw === 'true' || raw === 'false') {
    return raw;
  }

  // Legacy enum-filter shape used before the dedicated boolean filter.
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = raw as { operator?: string; value?: unknown };
    if (value.operator === 'eq' && (value.value === 'true' || value.value === 'false')) {
      return value.value;
    }
  }

  return '';
}

export function isInactiveBooleanFilterValue(raw: unknown): boolean {
  return parseBooleanFilterValue(raw) === '';
}
