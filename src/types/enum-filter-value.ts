import type { FilterOperatorValue } from '@/types/filter-operators';

export const ENUM_FILTER_OPERATORS = ['eq', 'in'] as const;

export const ENUM_FILTER_EMPTY_OPERATORS = ['empty', 'notEmpty'] as const;

export type EnumFilterOperator = (typeof ENUM_FILTER_OPERATORS)[number];
export type EnumFilterEmptyOperator = (typeof ENUM_FILTER_EMPTY_OPERATORS)[number];
export type EnumFilterOperatorWithEmpty = EnumFilterOperator | EnumFilterEmptyOperator;

export type EnumFilterValue =
  | FilterOperatorValue<'eq', { value: string }>
  | FilterOperatorValue<'in', { values: string[] }>
  | FilterOperatorValue<'empty'>
  | FilterOperatorValue<'notEmpty'>;

export function createDefaultEnumFilterValue(defaultOperator: EnumFilterOperator = 'eq'): EnumFilterValue {
  return createDefaultEnumFilterValueForOperator(defaultOperator);
}

export function createDefaultEnumFilterValueForOperator(operator: EnumFilterOperatorWithEmpty): EnumFilterValue {
  switch (operator) {
    case 'eq':
      return { operator: 'eq', value: '' };
    case 'in':
      return { operator: 'in', values: [] };
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

function isEnumFilterOperator(value: unknown): value is EnumFilterOperatorWithEmpty {
  return (
    typeof value === 'string' &&
    ([...ENUM_FILTER_OPERATORS, ...ENUM_FILTER_EMPTY_OPERATORS] as readonly string[]).includes(value)
  );
}

export function parseEnumFilterValue(raw: unknown, defaultOperator: EnumFilterOperator = 'eq'): EnumFilterValue {
  if (typeof raw === 'string') {
    return {
      operator: 'eq',
      value: raw,
    };
  }

  if (Array.isArray(raw)) {
    return {
      operator: 'in',
      values: raw.filter((item): item is string => typeof item === 'string'),
    };
  }

  if (!raw || typeof raw !== 'object') {
    return createDefaultEnumFilterValue(defaultOperator);
  }

  const value = raw as { operator?: EnumFilterOperatorWithEmpty };
  if (!isEnumFilterOperator(value.operator)) {
    return createDefaultEnumFilterValue(defaultOperator);
  }

  switch (value.operator) {
    case 'eq': {
      const { value: single } = value as { value?: string };
      return {
        operator: 'eq',
        value: typeof single === 'string' ? single : '',
      };
    }
    case 'in': {
      const { values } = value as { values?: unknown };
      return {
        operator: 'in',
        values: Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : [],
      };
    }
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

export function isInactiveEnumFilterValue(raw: unknown, defaultOperator: EnumFilterOperator = 'eq'): boolean {
  const parsed = parseEnumFilterValue(raw, defaultOperator);
  // Only the field's default operator with an empty payload is inactive.
  // Switching to the other operator keeps the filter so the select can stick.
  if (parsed.operator === 'empty' || parsed.operator === 'notEmpty') {
    return false;
  }
  if (parsed.operator !== defaultOperator) {
    return false;
  }
  if (parsed.operator === 'eq') {
    return parsed.value === '';
  }
  return parsed.values.length === 0;
}
