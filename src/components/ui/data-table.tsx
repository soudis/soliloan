import type { ViewType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import {
  type ColumnDef,
  type FilterFn,
  type RowData,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Settings } from 'lucide-react';
import { useState } from 'react';

import { getViewsByType } from '@/actions/views';
import { useTableStore } from '@/store/table-store';

import { DataTableBody } from './data-table-body';
import { DataTableHeader } from './data-table-header';
import { DataTablePagination } from './data-table-pagination';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    style?: {
      textAlign?: 'left' | 'center' | 'right';
    };
    fixed?: boolean;
  }
}

// Define the custom filter function for compound text fields
export const compoundTextFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!value) return false;

  // Convert both the value and filter to lowercase for case-insensitive search
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();

  return searchValue.includes(searchFilter);
};

// Define the custom number range filter function for number filtering
export const inNumberRangeFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (value === null || value === undefined) return false;

  // If no filter is applied, show all rows
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;

  // Convert the row value to a number
  const rowValue = Number(value);

  // Check if the number is within the range
  if (filterValue[0] !== null && filterValue[1] !== null) {
    return rowValue >= filterValue[0] && rowValue <= filterValue[1];
  } else if (filterValue[0] !== null) {
    // Only min value is set
    return rowValue >= filterValue[0];
  } else if (filterValue[1] !== null) {
    // Only max value is set
    return rowValue <= filterValue[1];
  }

  return true;
};

// Define the custom date filter function for date range filtering
export const dateRangeFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!value || typeof value !== 'string') return false;

  // If no filter is applied, show all rows
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;

  // Convert the row value to a Date object
  const rowDate = new Date(value);

  // Check if the date is within the range
  if (filterValue[0] && filterValue[1]) {
    const startDate = new Date(filterValue[0]);
    const endDate = new Date(filterValue[1]);
    // Set end date to end of day to include the entire day
    endDate.setUTCHours(23, 59, 59, 999);
    return rowDate >= startDate && rowDate <= endDate;
  } else if (filterValue[0]) {
    // Only start date is set
    const startDate = new Date(filterValue[0]);
    return rowDate >= startDate;
  } else if (filterValue[1]) {
    // Only end date is set
    const endDate = new Date(filterValue[1]);
    // Set end date to end of day to include the entire day
    endDate.setUTCHours(23, 59, 59, 999);
    return rowDate <= endDate;
  }

  return true;
};

// Define the column meta type to include the fixed property
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    fixed?: boolean;
  }
}

export type DataTableColumnFilters = {
  [key: string]: {
    type: 'text' | 'select' | 'number' | 'date';
    options?: { label: string; value: string }[];
    label?: string;
  };
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  showFilter?: boolean;
  columnFilters?: DataTableColumnFilters;
  defaultColumnVisibility?: VisibilityState;
  viewType: ViewType;
  actions?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  showColumnVisibility = true,
  showPagination = true,
  showFilter = true,
  columnFilters = {},
  defaultColumnVisibility = {},
  viewType,
  actions,
}: DataTableProps<TData, TValue>) {
  // Get the table store
  const { getState, setState } = useTableStore();

  // Initialize state from store if viewType is provided
  const storedState = viewType ? getState(viewType) : null;

  const sorting = storedState?.sorting ?? [];
  const columnFilterState = storedState?.columnFilters ?? [];

  const pagination = storedState?.pagination ?? {
    pageIndex: 0,
    pageSize: 25,
  };

  const columnVisibility = storedState?.columnVisibility ?? defaultColumnVisibility;
  const globalFilter = storedState?.globalFilter ?? '';

  const [rowSelection, setRowSelection] = useState({});

  const { data: views, isLoading } = useQuery({
    queryKey: ['views', viewType],
    queryFn: async () => {
      const { views: fetchedViews, error } = await getViewsByType(viewType ?? 'LOAN');
      if (error) {
        return [];
      }
      return fetchedViews;
    },
    enabled: !!viewType,
  });

  // Function to check if any filters are active
  const hasActiveFilters = () => {
    // Check if any column filters are active
    const hasColumnFilters = columnFilterState.some((filter) => {
      const value = filter.value;
      if (Array.isArray(value)) {
        // For range filters (number, date)
        return value.some((v) => v !== undefined && v !== '');
      }
      // For text and select filters
      return value !== undefined && value !== '';
    });

    // Only return true if column filters are active, ignoring global filter
    return hasColumnFilters;
  };

  // Add actions column if actions prop is provided
  const allColumns = [...columns];
  if (actions) {
    allColumns.push({
      id: 'actions',
      header: () => (
        <div className="flex justify-center">
          <Settings className="h-4 w-4" />
        </div>
      ),
      cell: ({ row }) => actions(row.original),
      meta: {
        fixed: true,
      },
    });
  }

  const table = useReactTable({
    data,
    columns: allColumns,
    onSortingChange: (updater) =>
      setState(viewType, {
        sorting: updater instanceof Function ? updater(sorting) : updater,
      }),
    onColumnFiltersChange: (updater) =>
      setState(viewType, {
        columnFilters: updater instanceof Function ? updater(columnFilterState) : updater,
      }),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: (updater) =>
      setState(viewType, {
        columnVisibility: updater instanceof Function ? updater(columnVisibility) : updater,
      }),
    onGlobalFilterChange: (updater) =>
      setState(viewType, {
        globalFilter: updater instanceof Function ? updater(globalFilter) : updater,
      }),
    onPaginationChange: (updater) =>
      setState(viewType, {
        pagination: updater instanceof Function ? updater(pagination) : updater,
      }),
    onRowSelectionChange: setRowSelection,

    state: {
      sorting,
      columnFilters: columnFilterState,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },
    // Add initial column visibility
    initialState: {
      columnVisibility,
    },
    // Register the custom filter functions
    filterFns: {
      compoundText: compoundTextFilter,
      dateRange: dateRangeFilter,
      inNumberRange: inNumberRangeFilter,
    },
    // Add global filter function to search across all columns
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (!value) return false;

      // Convert both the value and filter to lowercase for case-insensitive search
      const searchValue = String(value).toLowerCase();
      const searchFilter = String(filterValue).toLowerCase();

      return searchValue.includes(searchFilter);
    },
    // Enable global filtering for all columns
    enableGlobalFilter: true,
  });

  if (isLoading || !views) {
    return null;
  }

  return (
    <div>
      <DataTableHeader<TData>
        table={table}
        showColumnVisibility={showColumnVisibility}
        showFilter={showFilter}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        views={views}
        viewType={viewType}
        hasActiveFilters={hasActiveFilters}
        state={getState(viewType)}
      />

      <DataTableBody table={table} onRowClick={onRowClick} />

      {showPagination && <DataTablePagination table={table} />}
    </div>
  );
}
