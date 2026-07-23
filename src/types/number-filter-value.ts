import type { FilterOperatorValue } from '@/types/filter-operators';

export const NUMBER_FILTER_OPERATORS = ['between', 'eq', 'gt', 'lt', 'gte', 'lte'] as const;

export const NUMBER_FILTER_EMPTY_OPERATORS = ['empty', 'notEmpty'] as const;

export type NumberFilterOperator = (typeof NUMBER_FILTER_OPERATORS)[number];
export type NumberFilterEmptyOperator = (typeof NUMBER_FILTER_EMPTY_OPERATORS)[number];
export type NumberFilterOperatorWithEmpty = NumberFilterOperator | NumberFilterEmptyOperator;

export type NumberFilterValue =
  | FilterOperatorValue<'between', { min: number | null; max: number | null }>
  | FilterOperatorValue<'eq', { value: number | null }>
  | FilterOperatorValue<'gt', { value: number | null }>
  | FilterOperatorValue<'lt', { value: number | null }>
  | FilterOperatorValue<'gte', { value: number | null }>
  | FilterOperatorValue<'lte', { value: number | null }>
  | FilterOperatorValue<'empty'>
  | FilterOperatorValue<'notEmpty'>;

export function createDefaultNumberFilterValue(
  defaultOperator: NumberFilterOperator = 'between',
): NumberFilterValue {
  return createDefaultNumberFilterValueForOperator(defaultOperator);
}

export function createDefaultNumberFilterValueForOperator(
  operator: NumberFilterOperatorWithEmpty,
): NumberFilterValue {
  switch (operator) {
    case 'between':
      return { operator: 'between', min: null, max: null };
    case 'eq':
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte':
      return { operator, value: null };
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

function isNumberFilterOperator(value: unknown): value is NumberFilterOperatorWithEmpty {
  return (
    typeof value === 'string' &&
    ([...NUMBER_FILTER_OPERATORS, ...NUMBER_FILTER_EMPTY_OPERATORS] as readonly string[]).includes(value)
  );
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLegacyNumberRange(raw: unknown): NumberFilterValue | null {
  if (!Array.isArray(raw) || raw.length < 2) {
    return null;
  }
  return {
    operator: 'between',
    min: parseNullableNumber(raw[0]),
    max: parseNullableNumber(raw[1]),
  };
}

export function parseNumberFilterValue(
  raw: unknown,
  defaultOperator: NumberFilterOperator = 'between',
): NumberFilterValue {
  const legacy = parseLegacyNumberRange(raw);
  if (legacy) {
    return legacy;
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createDefaultNumberFilterValue(defaultOperator);
  }

  const value = raw as { operator?: NumberFilterOperatorWithEmpty };
  if (!isNumberFilterOperator(value.operator)) {
    return createDefaultNumberFilterValue(defaultOperator);
  }

  switch (value.operator) {
    case 'between': {
      const { min, max } = value as { min?: number | null; max?: number | null };
      return {
        operator: 'between',
        min: parseNullableNumber(min),
        max: parseNullableNumber(max),
      };
    }
    case 'eq':
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte': {
      const { value: single } = value as { value?: number | null };
      return {
        operator: value.operator,
        value: parseNullableNumber(single),
      };
    }
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

function hasEmptyPayload(parsed: NumberFilterValue): boolean {
  switch (parsed.operator) {
    case 'between':
      return parsed.min == null && parsed.max == null;
    case 'eq':
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte':
      return parsed.value == null;
    case 'empty':
    case 'notEmpty':
      return false;
  }
}

export function isInactiveNumberFilterValue(
  raw: unknown,
  defaultOperator: NumberFilterOperator = 'between',
): boolean {
  const parsed = parseNumberFilterValue(raw, defaultOperator);
  // Mirror enums/dates: only the default operator with an empty payload is inactive.
  // Other operators keep the filter in state so the operator select can stick.
  if (parsed.operator !== defaultOperator) {
    return false;
  }
  return hasEmptyPayload(parsed);
}
