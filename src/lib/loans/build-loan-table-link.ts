import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';

import { PROJECT_ID_KEY } from '@/lib/params';
import type { LoanTableWidgetConfig, TableViewColumnConfig } from '@/types/dashboard-widgets/table-view';
import type { EntityFilter } from '@/types/entity-filters';

function serializeBase64Json<T>(value: T): string {
  return btoa(JSON.stringify(value));
}

export function widgetFiltersToColumnFilters(filters: EntityFilter[]): ColumnFiltersState {
  return filters.map((filter) => ({
    id: filter.field,
    value: filter.value,
  }));
}

export function widgetColumnsToVisibility(
  columns: TableViewColumnConfig[],
  defaultColumnVisibility: VisibilityState,
): VisibilityState {
  const visibility: VisibilityState = {};

  for (const key of Object.keys(defaultColumnVisibility)) {
    visibility[key] = false;
  }

  for (const column of columns) {
    visibility[column.id] = column.visible;
  }

  return visibility;
}

export function buildLoanTableHrefFromWidget(options: {
  config: LoanTableWidgetConfig;
  projectId?: string | null;
  viewName?: string | null;
  defaultColumnVisibility: VisibilityState;
}): string {
  const params = new URLSearchParams();

  if (options.projectId) {
    params.set(PROJECT_ID_KEY, options.projectId);
  }

  const columnFilters = widgetFiltersToColumnFilters(options.config.filters);
  if (columnFilters.length > 0) {
    params.set('filters', serializeBase64Json(columnFilters));
  }

  if (options.config.defaultSort) {
    const sort: SortingState = [
      {
        id: options.config.defaultSort.columnId,
        desc: options.config.defaultSort.desc,
      },
    ];
    params.set('sort', serializeBase64Json(sort));
  }

  const columnVisibility = widgetColumnsToVisibility(options.config.columns, options.defaultColumnVisibility);
  params.set('cols', serializeBase64Json(columnVisibility));

  if (options.config.rowLimit !== 25) {
    params.set('pageSize', String(options.config.rowLimit));
  }

  const trimmedViewName = options.viewName?.trim();
  if (trimmedViewName) {
    params.set('viewName', trimmedViewName);
  }

  const query = params.toString();
  return query ? `/loans/list?${query}` : '/loans/list';
}
