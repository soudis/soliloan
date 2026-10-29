import type { ColumnFiltersState, Table, VisibilityState } from '@tanstack/react-table';

import type { DataTableColumnFilters } from '@/components/ui/data-table';
import type { TableUrlState } from '@/lib/hooks/use-table-url-state';
import { isInactiveBooleanFilterValue } from '@/types/boolean-filter-value';
import { createDefaultDateFilterValue, isInactiveDateFilterValue } from '@/types/date-filter-value';
import { createDefaultEnumFilterValue, isInactiveEnumFilterValue } from '@/types/enum-filter-value';
import {
  createDefaultNumberFilterValue,
  isInactiveNumberFilterValue,
  type NumberFilterOperator,
} from '@/types/number-filter-value';
import { createDefaultTextFilterValue, isInactiveTextFilterValue } from '@/types/text-filter-value';

export const GLOBAL_SEARCH_ALL = '__all__';
export const FILTER_REMOVE_VALUE = '__remove__';

export type ColumnFilterConfig = DataTableColumnFilters[string];

export function isInactiveFilterValue(
  value: unknown,
  type: ColumnFilterConfig['type'],
  defaultOperator?: NumberFilterOperator,
): boolean {
  if (type === 'boolean') {
    return isInactiveBooleanFilterValue(value);
  }

  if (value && typeof value === 'object' && !Array.isArray(value) && 'operator' in value) {
    const operator = (value as { operator: string }).operator;
    if (operator === 'empty' || operator === 'notEmpty') {
      return false;
    }
    switch (type) {
      case 'date':
        return isInactiveDateFilterValue(value);
      case 'number':
        return isInactiveNumberFilterValue(value, defaultOperator);
      case 'select':
        return isInactiveEnumFilterValue(value, 'eq');
      case 'multi-select':
        return isInactiveEnumFilterValue(value, 'in');
      default:
        return isInactiveTextFilterValue(value);
    }
  }

  switch (type) {
    case 'number':
      return isInactiveNumberFilterValue(value, defaultOperator);
    case 'select':
      return isInactiveEnumFilterValue(value, 'eq');
    case 'multi-select':
      return isInactiveEnumFilterValue(value, 'in');
    case 'date':
      return isInactiveDateFilterValue(value);
    default:
      return isInactiveTextFilterValue(value);
  }
}

export function createDefaultFilterValue(config: ColumnFilterConfig): unknown {
  switch (config.type) {
    case 'boolean':
      return '';
    case 'number':
      return createDefaultNumberFilterValue(config.defaultOperator ?? 'between');
    case 'date':
      return createDefaultDateFilterValue();
    case 'select':
      return createDefaultEnumFilterValue('eq');
    case 'multi-select':
      return createDefaultEnumFilterValue('in');
    default:
      return createDefaultTextFilterValue();
  }
}

export function getFilterableColumnIds<TData>(table: Table<TData>, columnFilters: DataTableColumnFilters): string[] {
  return table
    .getAllLeafColumns()
    .filter((column) => columnFilters[column.id])
    .map((column) => column.id);
}

export function getVisibleFilterColumnIds<TData>(
  table: Table<TData>,
  columnFilters: DataTableColumnFilters,
  columnVisibility: VisibilityState,
): string[] {
  return table
    .getAllLeafColumns()
    .filter((column) => {
      const visibleInState = columnVisibility[column.id] !== false;
      return visibleInState && column.getIsVisible() && columnFilters[column.id];
    })
    .map((column) => column.id);
}

/** Filterable columns that are not already taken, including hidden ones. */
export function getUntakenFilterColumnIds<TData>(
  table: Table<TData>,
  columnFilters: DataTableColumnFilters,
  tableState: Pick<TableUrlState, 'columnFilters' | 'quickSearchField'>,
  includeColumnId?: string,
): string[] {
  const taken = getTakenFilterTargets(tableState);
  if (includeColumnId) {
    taken.delete(includeColumnId);
  }
  return getFilterableColumnIds(table, columnFilters).filter((id) => !taken.has(id));
}

/** Targets already owned by QS (when not Alle) or by a present column filter. */
export function getTakenFilterTargets(
  tableState: Pick<TableUrlState, 'columnFilters' | 'quickSearchField'>,
): Set<string> {
  const taken = new Set(tableState.columnFilters.map((filter) => filter.id));
  if (tableState.quickSearchField) {
    taken.add(tableState.quickSearchField);
  }
  return taken;
}

export function getAvailableFilterTargets<TData>(
  table: Table<TData>,
  columnFilters: DataTableColumnFilters,
  tableState: Pick<TableUrlState, 'columnFilters' | 'quickSearchField' | 'columnVisibility'>,
  /** Current chip target stays selectable in its own dropdown. */
  includeColumnId?: string,
): string[] {
  const taken = getTakenFilterTargets(tableState);
  if (includeColumnId) {
    taken.delete(includeColumnId);
  }
  return getVisibleFilterColumnIds(table, columnFilters, tableState.columnVisibility).filter((id) => !taken.has(id));
}

export function resolveColumnFilterLabel<TData>(
  table: Table<TData>,
  columnId: string,
  columnFilters: DataTableColumnFilters,
): string {
  const column = table.getColumn(columnId);
  const config = columnFilters[columnId];
  return (
    column?.columnDef.meta?.labelShort ??
    config?.label ??
    column?.columnDef.meta?.labelLong ??
    column?.columnDef.meta?.export?.label ??
    columnId
  );
}

/** Same label the Spalten menu uses. */
export function resolveColumnChooserLabel<TData>(
  table: Table<TData>,
  columnId: string,
  columnFilters: DataTableColumnFilters,
): string {
  const column = table.getColumn(columnId);
  const config = columnFilters[columnId];
  return config?.label ?? column?.columnDef.meta?.labelLong ?? column?.columnDef.meta?.export?.label ?? columnId;
}

export function isFilterPresent(
  columnId: string,
  tableState: Pick<TableUrlState, 'columnFilters' | 'quickSearchField'>,
): boolean {
  if (tableState.quickSearchField === columnId) {
    return true;
  }
  return tableState.columnFilters.some((filter) => filter.id === columnId);
}

/** Column filter chips in the bar, including filters on hidden columns. Excludes the column owned by QS. */
export function getPresentColumnFilterIds(
  tableState: Pick<TableUrlState, 'columnFilters' | 'quickSearchField'>,
  columnFilters: DataTableColumnFilters,
): string[] {
  const qsField = tableState.quickSearchField;
  return tableState.columnFilters
    .map((filter) => filter.id)
    .filter((id) => id !== qsField && Boolean(columnFilters[id]));
}

export function upsertPresentFilterValue(
  columnFilters: ColumnFiltersState,
  columnId: string,
  value: unknown,
): ColumnFiltersState {
  const index = columnFilters.findIndex((filter) => filter.id === columnId);
  if (index === -1) {
    return [...columnFilters, { id: columnId, value }];
  }
  return columnFilters.map((filter, i) => (i === index ? { id: columnId, value } : filter));
}

export function addPresentFilter(
  columnFilters: ColumnFiltersState,
  columnId: string,
  config: ColumnFilterConfig,
): ColumnFiltersState {
  if (columnFilters.some((filter) => filter.id === columnId)) {
    return columnFilters;
  }
  return [...columnFilters, { id: columnId, value: createDefaultFilterValue(config) }];
}

export function removePresentFilter(columnFilters: ColumnFiltersState, columnId: string): ColumnFiltersState {
  return columnFilters.filter((filter) => filter.id !== columnId);
}

export function retargetPresentFilter(
  columnFilters: ColumnFiltersState,
  fromColumnId: string,
  toColumnId: string,
  toConfig: ColumnFilterConfig,
): ColumnFiltersState {
  if (fromColumnId === toColumnId) {
    return columnFilters;
  }

  const fromIndex = columnFilters.findIndex((filter) => filter.id === fromColumnId);
  const nextValue = { id: toColumnId, value: createDefaultFilterValue(toConfig) };

  // Drop the destination if it already exists elsewhere, then replace at the original index.
  const withoutTarget = removePresentFilter(columnFilters, toColumnId);
  const replaceIndex = withoutTarget.findIndex((filter) => filter.id === fromColumnId);

  if (fromIndex === -1 || replaceIndex === -1) {
    return addPresentFilter(withoutTarget, toColumnId, toConfig);
  }

  return withoutTarget.map((filter, index) => (index === replaceIndex ? nextValue : filter));
}

/** Clear quick search when its column becomes hidden. Column filters stay. */
export function cleanupFiltersForHiddenColumns(args: {
  nextVisibility: VisibilityState;
  quickSearchField: string;
}): Partial<Pick<TableUrlState, 'quickSearchField' | 'globalFilter'>> | null {
  const { nextVisibility, quickSearchField } = args;
  if (!quickSearchField || nextVisibility[quickSearchField] !== false) {
    return null;
  }

  return {
    quickSearchField: '',
    globalFilter: '',
  };
}

/** How many present filters currently have a non-inactive (active) value.
 * Excludes the column currently owned by quick search.
 */
export function countActiveFilters(
  tableState: Pick<TableUrlState, 'columnFilters' | 'quickSearchField'>,
  columnFilters: DataTableColumnFilters,
): number {
  const qsField = tableState.quickSearchField;
  return tableState.columnFilters.reduce((count, filter) => {
    if (filter.id === qsField) return count;
    const config = columnFilters[filter.id];
    if (!config) return count;
    return isInactiveFilterValue(filter.value, config.type, config.defaultOperator) ? count : count + 1;
  }, 0);
}

export type FilterPresenceApi = {
  config: DataTableColumnFilters;
  isPresent: (columnId: string) => boolean;
  setPresent: (columnId: string, present: boolean) => void;
};
