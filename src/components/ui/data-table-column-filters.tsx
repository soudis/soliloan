import type { ColumnFiltersState } from '@tanstack/react-table';

import { isInactiveDateFilterValue } from '@/types/date-filter-value';
import { isInactiveEnumFilterValue } from '@/types/enum-filter-value';
import { isInactiveNumberFilterValue, type NumberFilterOperator } from '@/types/number-filter-value';
import { isInactiveTextFilterValue } from '@/types/text-filter-value';
import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';
import { isInactiveBooleanFilterValue } from '@/types/boolean-filter-value';

import {
  BooleanFilter,
  DateFilter,
  MultiSelectFilter,
  NumberFilter,
  SelectFilter,
  TextFilter,
} from './data-table-column-filters/index';

type ColumnFilterConfig = {
  type: 'text' | 'select' | 'multi-select' | 'number' | 'date' | 'boolean';
  options?: { label: string; value: string }[];
  label?: string;
  allowEmpty?: boolean;
  defaultOperator?: NumberFilterOperator;
};

interface DataTableColumnFiltersProps {
  columnFilters: Record<string, ColumnFilterConfig>;
  tableState?: TableUrlState;
  setTableState?: SetTableUrlState;
  /** Controlled mode for contexts without URL state (e.g. dashboard widget filters). */
  controlled?: {
    columnFilters: ColumnFiltersState;
    onColumnFiltersChange: (filters: ColumnFiltersState) => void;
    columnVisibility?: Record<string, boolean>;
  };
}

function isEmptyFilterValue(
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

  // Legacy shapes before operator migration
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

export function DataTableColumnFilters({
  columnFilters,
  tableState,
  setTableState,
  controlled,
}: DataTableColumnFiltersProps) {
  const activeFilters = controlled?.columnFilters ?? tableState?.columnFilters ?? [];

  const handleFilterChange = (
    columnId: string,
    value: unknown,
    type: ColumnFilterConfig['type'],
    defaultOperator?: NumberFilterOperator,
  ) => {
    const filters = activeFilters.filter((filter) => filter.id !== columnId);

    if (!isEmptyFilterValue(value, type, defaultOperator)) {
      filters.push({ id: columnId, value });
    }

    if (controlled) {
      controlled.onColumnFiltersChange(filters);
      return;
    }
    setTableState?.({ columnFilters: filters });
  };

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Object.entries(columnFilters).map(([columnId, filterConfig]) => {
        const filterState = activeFilters.find((filter) => filter.id === columnId);

        const visibility = controlled?.columnVisibility ?? tableState?.columnVisibility;
        if (visibility?.[columnId] === false) return null;

        return (
          <div key={columnId} className="flex flex-col space-y-2">
            <span className="text-sm font-medium">{filterConfig.label || columnId}:</span>
            <div className="flex min-w-0 items-center">
              {(() => {
                switch (filterConfig.type) {
                  case 'boolean':
                    return (
                      <BooleanFilter
                        filterState={filterState}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value, 'boolean');
                        }}
                      />
                    );
                  case 'select':
                    return (
                      <SelectFilter
                        filterState={filterState}
                        options={filterConfig.options || []}
                        allowEmpty={filterConfig.allowEmpty}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value, 'select');
                        }}
                      />
                    );
                  case 'multi-select':
                    return (
                      <MultiSelectFilter
                        filterState={filterState}
                        options={filterConfig.options || []}
                        allowEmpty={filterConfig.allowEmpty}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value, 'multi-select');
                        }}
                      />
                    );
                  case 'number':
                    return (
                      <NumberFilter
                        filterState={filterState}
                        allowEmpty={filterConfig.allowEmpty}
                        defaultOperator={filterConfig.defaultOperator}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value, 'number', filterConfig.defaultOperator);
                        }}
                      />
                    );
                  case 'date':
                    return (
                      <DateFilter
                        filterState={filterState}
                        allowEmpty={filterConfig.allowEmpty}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value, 'date');
                        }}
                      />
                    );
                  default:
                    return (
                      <TextFilter
                        filterState={filterState}
                        label={filterConfig.label}
                        columnId={columnId}
                        allowEmpty={filterConfig.allowEmpty}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value, 'text');
                        }}
                      />
                    );
                }
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
