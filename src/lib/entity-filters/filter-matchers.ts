import type { DataTableColumnFilterType } from '@/lib/entity-filters/filter-definitions';

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

export function matchesDateRangeFilter(value: unknown, filterValue: unknown): boolean {
  if (!value) {
    return false;
  }
  const dateValue = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(dateValue.getTime())) {
    return false;
  }
  if (!filterValue || (!Array.isArray(filterValue) && typeof filterValue !== 'object')) {
    return true;
  }
  const range = filterValue as [string | null, string | null];
  if (!range[0] && !range[1]) {
    return true;
  }
  if (range[0] && range[1]) {
    const startDate = new Date(range[0]);
    const endDate = new Date(range[1]);
    endDate.setUTCHours(23, 59, 59, 999);
    return dateValue >= startDate && dateValue <= endDate;
  }
  if (range[0]) {
    return dateValue >= new Date(range[0]);
  }
  if (range[1]) {
    const endDate = new Date(range[1]);
    endDate.setUTCHours(23, 59, 59, 999);
    return dateValue <= endDate;
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

export function matchesFilterByType(
  value: unknown,
  filterValue: unknown,
  type: DataTableColumnFilterType,
): boolean {
  switch (type) {
    case 'number':
      return matchesNumberRangeFilter(value, filterValue);
    case 'date':
      return matchesDateRangeFilter(value, filterValue);
    case 'select':
      return matchesSelectFilter(value, filterValue);
    case 'multi-select':
      return matchesMultiSelectFilter(value, filterValue);
    default:
      return matchesTextFilter(value, filterValue);
  }
}
