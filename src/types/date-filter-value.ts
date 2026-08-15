import type { FilterOperatorValue } from '@/types/filter-operators';

export const DATE_FILTER_OPERATORS = [
  'between',
  'olderThan',
  'newerThan',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'lastYear',
  'last',
  'next',
] as const;

export const DATE_FILTER_LEGACY_OPERATORS = ['year'] as const;
export const DATE_FILTER_EMPTY_OPERATORS = ['empty', 'notEmpty'] as const;

export type DateFilterOperator = (typeof DATE_FILTER_OPERATORS)[number];
export type DateFilterLegacyOperator = (typeof DATE_FILTER_LEGACY_OPERATORS)[number];
export type DateFilterEmptyOperator = (typeof DATE_FILTER_EMPTY_OPERATORS)[number];
export type DateFilterOperatorWithLegacy =
  | DateFilterOperator
  | DateFilterLegacyOperator
  | DateFilterEmptyOperator;

export const DATE_FILTER_LAST_UNITS = ['days', 'months'] as const;

export type DateFilterLastUnit = (typeof DATE_FILTER_LAST_UNITS)[number];

export type DateFilterRelativeAmountValue = {
  amount: number | null;
  unit: DateFilterLastUnit;
};

export type DateFilterValue =
  | FilterOperatorValue<'between', { start: string | null; end: string | null }>
  | FilterOperatorValue<'last', DateFilterRelativeAmountValue>
  | FilterOperatorValue<'next', DateFilterRelativeAmountValue>
  | FilterOperatorValue<'olderThan', DateFilterRelativeAmountValue>
  | FilterOperatorValue<'newerThan', DateFilterRelativeAmountValue>
  | FilterOperatorValue<'thisMonth'>
  | FilterOperatorValue<'lastMonth'>
  | FilterOperatorValue<'thisYear'>
  | FilterOperatorValue<'lastYear'>
  | FilterOperatorValue<'year', { year: number }>
  | FilterOperatorValue<'empty'>
  | FilterOperatorValue<'notEmpty'>;

export function createDefaultDateFilterValue(): DateFilterValue {
  return {
    operator: 'between',
    start: null,
    end: null,
  };
}

export function createDefaultDateFilterValueForOperator(
  operator: DateFilterOperatorWithLegacy,
  referenceDate: Date = new Date(),
): DateFilterValue {
  switch (operator) {
    case 'between':
      return createDefaultDateFilterValue();
    case 'olderThan':
      return { operator: 'olderThan', amount: 30, unit: 'days' };
    case 'newerThan':
      return { operator: 'newerThan', amount: 30, unit: 'days' };
    case 'thisMonth':
      return { operator: 'thisMonth' };
    case 'lastMonth':
      return { operator: 'lastMonth' };
    case 'thisYear':
      return { operator: 'thisYear' };
    case 'lastYear':
      return { operator: 'lastYear' };
    case 'last':
      return { operator: 'last', amount: 12, unit: 'months' };
    case 'next':
      return { operator: 'next', amount: 12, unit: 'months' };
    case 'year':
      return { operator: 'year', year: referenceDate.getFullYear() };
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

function isDateFilterLastUnit(value: unknown): value is DateFilterLastUnit {
  return typeof value === 'string' && (DATE_FILTER_LAST_UNITS as readonly string[]).includes(value);
}

function parseRelativeAmount(value: unknown, fallback: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsedAmount = Number(value);
  return Number.isFinite(parsedAmount) ? Math.round(parsedAmount) : fallback;
}

function parseRelativeAmountFilter(
  value: unknown,
  operator: 'last' | 'next' | 'olderThan' | 'newerThan',
  defaults: DateFilterRelativeAmountValue,
): FilterOperatorValue<typeof operator, DateFilterRelativeAmountValue> {
  const { amount, unit } = value as { amount?: number; unit?: DateFilterLastUnit };
  return {
    operator,
    amount: parseRelativeAmount(amount, defaults.amount),
    unit: isDateFilterLastUnit(unit) ? unit : defaults.unit,
  };
}

function isDateFilterOperator(value: unknown): value is DateFilterOperatorWithLegacy {
  return (
    typeof value === 'string' &&
    ([
      ...DATE_FILTER_OPERATORS,
      ...DATE_FILTER_LEGACY_OPERATORS,
      ...DATE_FILTER_EMPTY_OPERATORS,
    ] as readonly string[]).includes(value)
  );
}

export function parseDateFilterValue(raw: unknown): DateFilterValue {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createDefaultDateFilterValue();
  }

  const value = raw as { operator?: DateFilterOperatorWithLegacy };
  if (!isDateFilterOperator(value.operator)) {
    return createDefaultDateFilterValue();
  }

  switch (value.operator) {
    case 'between': {
      const { start, end } = value as { start?: string | null; end?: string | null };
      return {
        operator: 'between',
        start: typeof start === 'string' ? start : null,
        end: typeof end === 'string' ? end : null,
      };
    }
    case 'last':
      return parseRelativeAmountFilter(value, 'last', { amount: 12, unit: 'months' });
    case 'next':
      return parseRelativeAmountFilter(value, 'next', { amount: 12, unit: 'months' });
    case 'olderThan':
      return parseRelativeAmountFilter(value, 'olderThan', { amount: 30, unit: 'days' });
    case 'newerThan':
      return parseRelativeAmountFilter(value, 'newerThan', { amount: 30, unit: 'days' });
    case 'thisMonth':
      return { operator: 'thisMonth' };
    case 'lastMonth':
      return { operator: 'lastMonth' };
    case 'thisYear':
      return { operator: 'thisYear' };
    case 'lastYear':
      return { operator: 'lastYear' };
    case 'year': {
      const { year } = value as { year?: number };
      const parsedYear = Number(year);
      return {
        operator: 'year',
        year: Number.isFinite(parsedYear) ? Math.round(parsedYear) : new Date().getFullYear(),
      };
    }
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
  }
}

export function isInactiveDateFilterValue(raw: unknown): boolean {
  const parsed = parseDateFilterValue(raw);
  if (parsed.operator === 'empty' || parsed.operator === 'notEmpty') {
    return false;
  }
  return parsed.operator === 'between' && !parsed.start && !parsed.end;
}
