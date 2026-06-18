import type { DataTableColumnFilterType } from '@/lib/entity-filters/filter-definitions';
import { resolveEntityDateFilterBounds } from '@/lib/entity-filters/resolve-date-filter-range';

export function matchesTextFilter(value: unknown, filterValue: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();
  return searchValue.includes(searchFilter);
}

export function matchesNumberRangeFilter(value: unknown, filterValue: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (!filterValue || (!Array.isArray(filterValue) && typeof filterValue !== 'object')) {
    return true;
  }
  const range = filterValue as [number | null, number | null];
  if (range[0] == null && range[1] == null) {
    return true;
  }
  const rowValue = Number(value);
  if (Number.isNaN(rowValue)) {
    return false;
  }
  if (range[0] !== null && range[1] !== null) {
    return rowValue >= range[0] && rowValue <= range[1];
  }
  if (range[0] !== null) {
    return rowValue >= range[0];
  }
  if (range[1] !== null) {
    return rowValue <= range[1];
  }
  return true;
}

export function matchesDateRangeFilter(
  value: unknown,
  filterValue: unknown,
  referenceDate: Date = new Date(),
): boolean {
  if (!value) {
    return false;
  }
  const dateValue = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(dateValue.getTime())) {
    return false;
  }

  const bounds = resolveEntityDateFilterBounds(filterValue, referenceDate);
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

export function matchesSelectFilter(value: unknown, filterValue: unknown): boolean {
  if (filterValue === '' || filterValue == null) {
    return true;
  }
  return String(value) === String(filterValue);
}

export function matchesMultiSelectFilter(value: unknown, filterValue: unknown): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }
  return filterValue.includes(String(value));
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
      return matchesDateRangeFilter(value, filterValue, options?.referenceDate);
    case 'select':
      return matchesSelectFilter(value, filterValue);
    case 'multi-select':
      return matchesMultiSelectFilter(value, filterValue);
    default:
      return matchesTextFilter(value, filterValue);
  }
}
