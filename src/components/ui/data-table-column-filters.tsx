import type { ColumnFiltersState } from '@tanstack/react-table';

import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';

import {
  DateFilter,
  MultiSelectFilter,
  NumberFilter,
  SelectFilter,
  TextFilter,
} from './data-table-column-filters/index';

type ColumnFilterConfig = {
  type: 'text' | 'select' | 'multi-select' | 'number' | 'date';
  options?: { label: string; value: string }[];
  label?: string;
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

function isEmptyFilterValue(value: unknown): boolean {
  return value === '' || value == null || (Array.isArray(value) && value.every((v) => v === '' || v == null));
}

export function DataTableColumnFilters({
  columnFilters,
  tableState,
  setTableState,
  controlled,
}: DataTableColumnFiltersProps) {
  const activeFilters = controlled?.columnFilters ?? tableState?.columnFilters ?? [];

  const handleFilterChange = (columnId: string, value: unknown) => {
    const filters = activeFilters.filter((filter) => filter.id !== columnId);

    if (!isEmptyFilterValue(value)) {
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
            <div className="flex items-center space-x-2">
              {(() => {
                switch (filterConfig.type) {
                  case 'select':
                    return (
                      <SelectFilter
                        filterState={filterState}
                        options={filterConfig.options || []}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value);
                        }}
                      />
                    );
                  case 'multi-select':
                    return (
                      <MultiSelectFilter
                        filterState={filterState}
                        options={filterConfig.options || []}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value);
                        }}
                      />
                    );
                  case 'number':
                    return (
                      <NumberFilter
                        filterState={filterState}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value);
                        }}
                      />
                    );
                  case 'date':
                    return (
                      <DateFilter
                        filterState={filterState}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value);
                        }}
                      />
                    );
                  default:
                    return (
                      <TextFilter
                        filterState={filterState}
                        label={filterConfig.label}
                        columnId={columnId}
                        onFilterChange={(value) => {
                          handleFilterChange(columnId, value);
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
