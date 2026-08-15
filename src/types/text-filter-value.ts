import type { FilterOperatorValue } from '@/types/filter-operators';

export const TEXT_FILTER_OPERATORS = ['contains', 'startsWith', 'endsWith', 'eq'] as const;

export const TEXT_FILTER_EMPTY_OPERATORS = ['empty', 'notEmpty'] as const;

export type TextFilterOperator = (typeof TEXT_FILTER_OPERATORS)[number];
export type TextFilterEmptyOperator = (typeof TEXT_FILTER_EMPTY_OPERATORS)[number];
export type TextFilterOperatorWithEmpty = TextFilterOperator | TextFilterEmptyOperator;

export type TextFilterValue =
  | FilterOperatorValue<'contains', { value: string }>
  | FilterOperatorValue<'startsWith', { value: string }>
  | FilterOperatorValue<'endsWith', { value: string }>
  | FilterOperatorValue<'eq', { value: string }>
  | FilterOperatorValue<'empty'>
  | FilterOperatorValue<'notEmpty'>;

export function createDefaultTextFilterValue(): TextFilterValue {
  return {
    operator: 'contains',
    value: '',
  };
}

export function createDefaultTextFilterValueForOperator(
  operator: TextFilterOperatorWithEmpty,
): TextFilterValue {
  switch (operator) {
    case 'contains':
    case 'startsWith':
    case 'endsWith':
    case 'eq':
      return { operator, value: '' };
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

function isTextFilterOperator(value: unknown): value is TextFilterOperatorWithEmpty {
  return (
    typeof value === 'string' &&
    ([...TEXT_FILTER_OPERATORS, ...TEXT_FILTER_EMPTY_OPERATORS] as readonly string[]).includes(value)
  );
}

export function parseTextFilterValue(raw: unknown): TextFilterValue {
  if (typeof raw === 'string') {
    return {
      operator: 'contains',
      value: raw,
    };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createDefaultTextFilterValue();
  }

  const value = raw as { operator?: TextFilterOperatorWithEmpty };
  if (!isTextFilterOperator(value.operator)) {
    return createDefaultTextFilterValue();
  }

  switch (value.operator) {
    case 'contains':
    case 'startsWith':
    case 'endsWith':
    case 'eq': {
      const { value: text } = value as { value?: string };
      return {
        operator: value.operator,
        value: typeof text === 'string' ? text : '',
      };
    }
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

export function isInactiveTextFilterValue(raw: unknown): boolean {
  const parsed = parseTextFilterValue(raw);
  // Mirror dates: only the default operator with an empty payload is inactive.
  return parsed.operator === 'contains' && parsed.value.trim() === '';
}
