import type { FilterOperatorValue } from '@/types/filter-operators';

/** Selectable duration operators. `gt` and `lte` are retired and rewritten on read. */
export const DURATION_FILTER_OPERATORS = ['eq', 'gte', 'lt', 'between'] as const;

const RETIRED_DURATION_OPERATORS = ['gt', 'lte'] as const;

export const DURATION_FILTER_EMPTY_OPERATORS = ['empty', 'notEmpty'] as const;

export const DURATION_FILTER_TERMINATION_OPERATORS = ['termination'] as const;

export const DURATION_FILTER_UNITS = ['days', 'months', 'years'] as const;

export type DurationFilterOperator = (typeof DURATION_FILTER_OPERATORS)[number];
export type DurationFilterEmptyOperator = (typeof DURATION_FILTER_EMPTY_OPERATORS)[number];
export type DurationFilterTerminationOperator = (typeof DURATION_FILTER_TERMINATION_OPERATORS)[number];
export type DurationFilterOperatorWithEmpty =
  | DurationFilterOperator
  | DurationFilterEmptyOperator
  | DurationFilterTerminationOperator;

export type DurationFilterUnit = (typeof DURATION_FILTER_UNITS)[number];

export type DurationFilterValue =
  | FilterOperatorValue<'between', { min: number | null; max: number | null; unit: DurationFilterUnit }>
  | FilterOperatorValue<'eq', { amount: number | null; unit: DurationFilterUnit }>
  | FilterOperatorValue<'lt', { amount: number | null; unit: DurationFilterUnit }>
  | FilterOperatorValue<'gte', { amount: number | null; unit: DurationFilterUnit }>
  | FilterOperatorValue<'empty'>
  | FilterOperatorValue<'notEmpty'>
  | FilterOperatorValue<'termination'>;

type RetiredDurationOperator = (typeof RETIRED_DURATION_OPERATORS)[number];

export function createDefaultDurationFilterValue(defaultOperator: DurationFilterOperator = 'eq'): DurationFilterValue {
  return createDefaultDurationFilterValueForOperator(defaultOperator);
}

export function createDefaultDurationFilterValueForOperator(
  operator: DurationFilterOperatorWithEmpty,
): DurationFilterValue {
  switch (operator) {
    case 'between':
      return { operator: 'between', min: null, max: null, unit: 'years' };
    case 'eq':
    case 'lt':
    case 'gte':
      return { operator, amount: null, unit: 'years' };
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
    case 'termination':
      return { operator: 'termination' };
  }
}

function isParsableDurationOperator(
  value: unknown,
): value is DurationFilterOperatorWithEmpty | RetiredDurationOperator {
  return (
    typeof value === 'string' &&
    (
      [
        ...DURATION_FILTER_OPERATORS,
        ...DURATION_FILTER_EMPTY_OPERATORS,
        ...DURATION_FILTER_TERMINATION_OPERATORS,
        ...RETIRED_DURATION_OPERATORS,
      ] as readonly string[]
    ).includes(value)
  );
}

/**
 * `>` N is the same set as `ab` N+1, and `≤` N is the same set as `bis` N+1,
 * because the compared units are whole numbers.
 */
function canonicalAmountOperator(
  operator: 'eq' | 'lt' | 'gte' | RetiredDurationOperator,
  amount: number | null,
  unit: DurationFilterUnit,
): DurationFilterValue {
  if (operator === 'gt') {
    return { operator: 'gte', amount: amount == null ? null : Math.floor(amount) + 1, unit };
  }
  if (operator === 'lte') {
    return { operator: 'lt', amount: amount == null ? null : Math.floor(amount) + 1, unit };
  }
  return { operator, amount, unit };
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseUnit(value: unknown): DurationFilterUnit {
  if (typeof value === 'string' && (DURATION_FILTER_UNITS as readonly string[]).includes(value)) {
    return value as DurationFilterUnit;
  }
  return 'years';
}

/**
 * Legacy number-filter payloads store a day count in `value` / `min` / `max`.
 * Arrays `[min, max]` are also treated as day bounds.
 */
function parseLegacyNumberAsDays(raw: unknown): DurationFilterValue | null {
  if (Array.isArray(raw) && raw.length >= 2) {
    return {
      operator: 'between',
      min: parseNullableNumber(raw[0]),
      max: parseNullableNumber(raw[1]),
      unit: 'days',
    };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const value = raw as {
    operator?: string;
    value?: unknown;
    min?: unknown;
    max?: unknown;
    amount?: unknown;
    unit?: unknown;
  };

  // Already a duration-shaped payload (has unit, or amount instead of value).
  if (value.unit !== undefined || value.amount !== undefined) {
    return null;
  }

  if (!isParsableDurationOperator(value.operator)) {
    return null;
  }

  switch (value.operator) {
    case 'between':
      return {
        operator: 'between',
        min: parseNullableNumber(value.min),
        max: parseNullableNumber(value.max),
        unit: 'days',
      };
    case 'eq':
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte':
      return canonicalAmountOperator(value.operator, parseNullableNumber(value.value), 'days');
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
    case 'termination':
      return { operator: 'termination' };
  }
}

export function parseDurationFilterValue(
  raw: unknown,
  defaultOperator: DurationFilterOperator = 'eq',
): DurationFilterValue {
  const legacy = parseLegacyNumberAsDays(raw);
  if (legacy) {
    return legacy;
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createDefaultDurationFilterValue(defaultOperator);
  }

  const value = raw as { operator?: DurationFilterOperatorWithEmpty | RetiredDurationOperator };
  if (!isParsableDurationOperator(value.operator)) {
    return createDefaultDurationFilterValue(defaultOperator);
  }

  switch (value.operator) {
    case 'between': {
      const { min, max, unit } = value as {
        min?: number | null;
        max?: number | null;
        unit?: DurationFilterUnit;
      };
      return {
        operator: 'between',
        min: parseNullableNumber(min),
        max: parseNullableNumber(max),
        unit: parseUnit(unit),
      };
    }
    case 'eq':
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte': {
      const { amount, unit } = value as { amount?: number | null; unit?: DurationFilterUnit };
      return canonicalAmountOperator(value.operator, parseNullableNumber(amount), parseUnit(unit));
    }
    case 'empty':
      return { operator: 'empty' };
    case 'notEmpty':
      return { operator: 'notEmpty' };
    case 'termination':
      return { operator: 'termination' };
  }
}

function hasEmptyPayload(parsed: DurationFilterValue): boolean {
  switch (parsed.operator) {
    case 'between':
      return parsed.min == null && parsed.max == null;
    case 'eq':
    case 'lt':
    case 'gte':
      return parsed.amount == null;
    case 'empty':
    case 'notEmpty':
    case 'termination':
      return false;
  }
}

export function isInactiveDurationFilterValue(raw: unknown, defaultOperator: DurationFilterOperator = 'eq'): boolean {
  const parsed = parseDurationFilterValue(raw, defaultOperator);
  if (parsed.operator !== defaultOperator) {
    return false;
  }
  return hasEmptyPayload(parsed);
}
