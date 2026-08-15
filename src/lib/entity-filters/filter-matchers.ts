import type { DataTableColumnFilterType } from '@/lib/entity-filters/filter-definitions';
import { resolveDateFilterBounds } from '@/lib/entity-filters/resolve-date-filter-range';
import { parseBooleanFilterValue } from '@/types/boolean-filter-value';
import { parseDateFilterValue } from '@/types/date-filter-value';
import { parseEnumFilterValue } from '@/types/enum-filter-value';
import { parseNumberFilterValue } from '@/types/number-filter-value';
import { parseTextFilterValue } from '@/types/text-filter-value';

function isNullishOrBlank(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return false;
}

export function matchesTextFilter(value: unknown, filterValue: unknown): boolean {
  const parsed = parseTextFilterValue(filterValue);

  if (parsed.operator === 'empty') {
    return isNullishOrBlank(value);
  }
  if (parsed.operator === 'notEmpty') {
    return !isNullishOrBlank(value);
  }

  if (parsed.value.trim() === '') {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const searchValue = String(value).toLowerCase();
  const searchFilter = parsed.value.toLowerCase();

  switch (parsed.operator) {
    case 'contains':
      return searchValue.includes(searchFilter);
    case 'startsWith':
      return searchValue.startsWith(searchFilter);
    case 'endsWith':
      return searchValue.endsWith(searchFilter);
    case 'eq':
      return searchValue === searchFilter;
  }
}

export function matchesNumberRangeFilter(value: unknown, filterValue: unknown): boolean {
  const parsed = parseNumberFilterValue(filterValue);

  if (parsed.operator === 'empty') {
    return value === null || value === undefined;
  }
  if (parsed.operator === 'notEmpty') {
    return value !== null && value !== undefined;
  }

  if (
    (parsed.operator === 'eq' ||
      parsed.operator === 'gt' ||
      parsed.operator === 'lt' ||
      parsed.operator === 'gte' ||
      parsed.operator === 'lte') &&
    parsed.value == null
  ) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const rowValue = Number(value);
  if (Number.isNaN(rowValue)) {
    return false;
  }

  switch (parsed.operator) {
    case 'between': {
      if (parsed.min == null && parsed.max == null) {
        return true;
      }
      if (parsed.min !== null && parsed.max !== null) {
        return rowValue >= parsed.min && rowValue <= parsed.max;
      }
      if (parsed.min !== null) {
        return rowValue >= parsed.min;
      }
      if (parsed.max !== null) {
        return rowValue <= parsed.max;
      }
      return true;
    }
    case 'eq':
      return rowValue === parsed.value;
    case 'gt':
      return rowValue > (parsed.value as number);
    case 'lt':
      return rowValue < (parsed.value as number);
    case 'gte':
      return rowValue >= (parsed.value as number);
    case 'lte':
      return rowValue <= (parsed.value as number);
  }
}

export function matchesDateFilter(
  value: unknown,
  filterValue: unknown,
  referenceDate: Date = new Date(),
): boolean {
  const parsed = parseDateFilterValue(filterValue);

  if (parsed.operator === 'empty') {
    return value === null || value === undefined;
  }
  if (parsed.operator === 'notEmpty') {
    return value !== null && value !== undefined;
  }

  if (!value) {
    return false;
  }

  const dateValue = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(dateValue.getTime())) {
    return false;
  }

  const bounds = resolveDateFilterBounds(filterValue, referenceDate);
  if (!bounds) {
    return true;
  }

  const { start, end } = bounds;
  if (start && end) {
    return dateValue >= start && dateValue <= end;
  }
  if (start) {
    return dateValue >= start;
  }
  if (end) {
    return dateValue <= end;
  }
  return true;
}

export function matchesEnumFilter(
  value: unknown,
  filterValue: unknown,
  defaultOperator: 'eq' | 'in' = 'eq',
): boolean {
  const parsed = parseEnumFilterValue(filterValue, defaultOperator);

  if (parsed.operator === 'empty') {
    return isNullishOrBlank(value);
  }
  if (parsed.operator === 'notEmpty') {
    return !isNullishOrBlank(value);
  }

  if (parsed.operator === 'eq') {
    if (parsed.value === '') {
      return true;
    }
    return String(value) === parsed.value;
  }

  if (parsed.values.length === 0) {
    return true;
  }
  return parsed.values.includes(String(value));
}

export function matchesSelectFilter(value: unknown, filterValue: unknown): boolean {
  return matchesEnumFilter(value, filterValue, 'eq');
}

export function matchesMultiSelectFilter(value: unknown, filterValue: unknown): boolean {
  return matchesEnumFilter(value, filterValue, 'in');
}

export function matchesBooleanFilter(value: unknown, filterValue: unknown): boolean {
  const parsed = parseBooleanFilterValue(filterValue);
  if (parsed === '') {
    return true;
  }
  const normalized = value === true || value === 'true' ? 'true' : 'false';
  return normalized === parsed;
}

export type FilterMatchOptions = {
  referenceDate?: Date;
};

export function matchesFilterByType(
  value: unknown,
  filterValue: unknown,
  type: DataTableColumnFilterType,
  options?: FilterMatchOptions,
): boolean {
  switch (type) {
    case 'number':
      return matchesNumberRangeFilter(value, filterValue);
    case 'date':
      return matchesDateFilter(value, filterValue, options?.referenceDate);
    case 'select':
      return matchesSelectFilter(value, filterValue);
    case 'multi-select':
      return matchesMultiSelectFilter(value, filterValue);
    case 'boolean':
      return matchesBooleanFilter(value, filterValue);
    default:
      return matchesTextFilter(value, filterValue);
  }
}
