import type { ViewType } from '@prisma/client';
import type { TableState } from '@tanstack/react-table';

import { useTableStore } from '@/store/table-store';

import { DateFilter, NumberFilter, SelectFilter, TextFilter } from './data-table-column-filters/index';

interface DataTableColumnFiltersProps {
  columnFilters: {
    [key: string]: {
      type: 'text' | 'select' | 'number' | 'date';
      options?: { label: string; value: string }[];
      label?: string;
    };
  };
  state: Partial<TableState>;
  viewType: ViewType;
}

export function DataTableColumnFilters({ columnFilters, state, viewType }: DataTableColumnFiltersProps) {
  const { setState } = useTableStore();

  const handleFilterChange = (columnId: string, value: unknown) => {
    setState(viewType, {
      columnFilters: [
        ...(state.columnFilters ?? []).filter((filter) => filter.id !== columnId),
        {
          id: columnId,
          value,
        },
      ],
    });
  };

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Object.entries(columnFilters).map(([columnId, filterConfig]) => {
        const filterState = state.columnFilters?.find((filter) => filter.id === columnId);

        // Only show filter if the column is visible
        if (state.columnVisibility?.[columnId] === false) return null;

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
