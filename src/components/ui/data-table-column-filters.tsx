import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';

import { DateFilter, NumberFilter, SelectFilter, TextFilter } from './data-table-column-filters/index';

interface DataTableColumnFiltersProps {
  columnFilters: {
    [key: string]: {
      type: 'text' | 'select' | 'number' | 'date';
      options?: { label: string; value: string }[];
      label?: string;
    };
  };
  tableState: TableUrlState;
  setTableState: SetTableUrlState;
}

function isEmptyFilterValue(value: unknown): boolean {
  return value === '' || value == null || (Array.isArray(value) && value.every((v) => v === '' || v == null));
}

export function DataTableColumnFilters({ columnFilters, tableState, setTableState }: DataTableColumnFiltersProps) {
  const handleFilterChange = (columnId: string, value: unknown) => {
    const currentFilters = tableState.columnFilters ?? [];
    const filters = currentFilters.filter((filter) => filter.id !== columnId);

    if (!isEmptyFilterValue(value)) {
      filters.push({ id: columnId, value });
    }

    setTableState({ columnFilters: filters });
  };

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Object.entries(columnFilters).map(([columnId, filterConfig]) => {
        const filterState = tableState.columnFilters?.find((filter) => filter.id === columnId);

        // Only show filter if the column is visible
        if (tableState.columnVisibility?.[columnId] === false) return null;

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
