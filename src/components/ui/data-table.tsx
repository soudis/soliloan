import type { ViewType } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import {
  type ColumnDef,
  type FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowData,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getViewsByType } from '@/actions/views';
import { useTableUrlState } from '@/lib/hooks/use-table-url-state';

import { Checkbox } from './checkbox';
import { DataTableBody } from './data-table-body';
import { DataTableBulkBar } from './data-table-bulk-bar';
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

  let result = true;
  // Check if the number is within the range
  if (filterValue[0] !== null && filterValue[1] !== null) {
    result = rowValue >= filterValue[0] && rowValue <= filterValue[1];
  } else if (filterValue[0] !== null) {
    // Only min value is set
    result = rowValue >= filterValue[0];
  } else if (filterValue[1] !== null) {
    // Only max value is set
    result = rowValue <= filterValue[1];
  }

  return result;
};

// Define the custom date filter function for date range filtering
export const dateRangeFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!value || typeof value !== 'string') return false;

  // If no filter is applied, show all rows
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;

  // Convert the row value to a Date object
  const rowDate = new Date(value);

  let result = true;

  // Check if the date is within the range
  if (filterValue[0] && filterValue[1]) {
    const startDate = new Date(filterValue[0]);
    const endDate = new Date(filterValue[1]);
    // Set end date to end of day to include the entire day
    endDate.setUTCHours(23, 59, 59, 999);
    result = rowDate >= startDate && rowDate <= endDate;
  } else if (filterValue[0]) {
    // Only start date is set
    const startDate = new Date(filterValue[0]);
    result = rowDate >= startDate;
  } else if (filterValue[1]) {
    // Only end date is set
    const endDate = new Date(filterValue[1]);
    // Set end date to end of day to include the entire day
    endDate.setUTCHours(23, 59, 59, 999);
    result = rowDate <= endDate;
  }

  return result;
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

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: (ids: string[]) => void | Promise<void>;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  showFilter?: boolean;
  columnFilters?: DataTableColumnFilters;
  defaultColumnVisibility?: VisibilityState;
  viewType?: ViewType;
  isLoading?: boolean;
  actions?: (row: TData) => React.ReactNode;
  bulkActions?: BulkAction[];
  getRowId?: (row: TData) => string;
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
  isLoading,
  actions,
  bulkActions,
  getRowId = (row) => (row as Record<string, unknown>).id as string,
}: DataTableProps<TData, TValue>) {
  const { data: views, isLoading: isViewsLoading } = useQuery({
    queryKey: ['views', viewType],
    queryFn: async () => {
      if (!viewType) return [];
      const { views: fetchedViews, error } = await getViewsByType(viewType);
      if (error) {
        return [];
      }
      return fetchedViews;
    },
    enabled: !!viewType,
  });

  // Get table state from URL — views are passed so the hook can diff against the selected view's baseline
  const { state: tableState, setState: setTableState } = useTableUrlState({
    defaultColumnVisibility,
    views: views ?? [],
  });

  const sorting = tableState.sorting;
  const columnFilterState = tableState.columnFilters;

  const pagination = {
    pageIndex: tableState.pageIndex,
    pageSize: tableState.pageSize,
  };

  const columnVisibility = tableState.columnVisibility;
  const globalFilter = tableState.globalFilter;

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Clear selection when data changes (e.g., after bulk delete + revalidation)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset selection when data reference changes
  useEffect(() => {
    setRowSelection({});
  }, [data]);

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

  const hasBulkActions = !!bulkActions?.length;

  // Build columns with optional checkbox select and actions columns
  const allColumns = useMemo(() => {
    const cols: ColumnDef<TData, TValue>[] = [];

    if (hasBulkActions) {
      cols.push({
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center px-1" data-bulk-select>
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center px-1" data-bulk-select>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        meta: {
          fixed: false,
        },
      });
    }

    cols.push(...columns);

    if (actions) {
      cols.push({
        id: 'actions',
        header: () => (
          <div className="flex h-full w-full items-center justify-center">
            <Settings className="h-4 w-4" />
          </div>
        ),
        cell: ({ row }) => <div className="flex items-center justify-center">{actions(row.original)}</div>,
        meta: {
          fixed: true,
        },
      });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, actions, hasBulkActions]);

  // Compute selected row IDs for bulk actions
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key]);
  }, [rowSelection]);

  const handleBulkComplete = () => {
    setRowSelection({});
  };

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId: (row) => getRowId(row),
    enableRowSelection: hasBulkActions,
    onSortingChange: (updater) => {
      setTableState({
        sorting: updater instanceof Function ? updater(sorting) : updater,
      });
    },
    onColumnFiltersChange: (updater) => {
      setTableState({
        columnFilters: updater instanceof Function ? updater(columnFilterState) : updater,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: (updater) => {
      const next = updater instanceof Function ? updater(columnVisibility) : updater;
      setTableState({ columnVisibility: next });
    },
    onGlobalFilterChange: (updater) => {
      const next = updater instanceof Function ? updater(globalFilter) : updater;
      setTableState({ globalFilter: next });
    },
    onPaginationChange: (updater) => {
      const resolved = updater instanceof Function ? updater(pagination) : updater;
      setTableState({
        pageIndex: resolved.pageIndex,
        pageSize: resolved.pageSize,
      });
    },
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

  if ((viewType && (isViewsLoading || !views)) || isLoading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        {tableState.globalFilter ? 'Suchen...' : 'Laden...'}
      </div>
    );
  }

  return (
    <div>
      <DataTableHeader<TData>
        table={table}
        showColumnVisibility={showColumnVisibility}
        showFilter={showFilter}
        columnFilters={columnFilters}
        defaultColumnVisibility={defaultColumnVisibility}
        views={views || []}
        viewType={viewType}
        hasActiveFilters={hasActiveFilters}
        tableState={tableState}
        setTableState={setTableState}
      />

      {bulkActions && selectedIds.length > 0 && (
        <DataTableBulkBar
          selectedCount={selectedIds.length}
          selectedIds={selectedIds}
          bulkActions={bulkActions}
          onComplete={handleBulkComplete}
        />
      )}

      <DataTableBody table={table} onRowClick={onRowClick} hasBulkSelect={hasBulkActions} />

      {showPagination && <DataTablePagination table={table} />}
    </div>
  );
}
