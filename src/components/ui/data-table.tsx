import { createView, deleteView, getViewById } from '@/app/actions/views'
import { useTableStore } from '@/store/table-store'
import { ViewType } from '@prisma/client'
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState
} from '@tanstack/react-table'
import { de, enUS } from 'date-fns/locale'
import { Settings } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { DataTableBody } from './data-table-body'
import { DataTableColumnFilters } from './data-table-column-filters'
import { DataTableHeader } from './data-table-header'
import { DataTablePagination } from './data-table-pagination'

// Define the custom filter function for compound text fields
export const compoundTextFilter: FilterFn<any> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!value) return false;

  // Convert both the value and filter to lowercase for case-insensitive search
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();

  return searchValue.includes(searchFilter);
};

// Define the custom number range filter function for number filtering
export const inNumberRangeFilter: FilterFn<any> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (value === null || value === undefined) return false;

  // If no filter is applied, show all rows
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;

  // Convert the row value to a number
  const rowValue = Number(value);

  // Check if the number is within the range
  if (filterValue[0] !== undefined && filterValue[1] !== undefined) {
    return rowValue >= filterValue[0] && rowValue <= filterValue[1];
  } else if (filterValue[0] !== undefined) {
    // Only min value is set
    return rowValue >= filterValue[0];
  } else if (filterValue[1] !== undefined) {
    // Only max value is set
    return rowValue <= filterValue[1];
  }

  return true;
};

// Define the custom date filter function for date range filtering
export const dateRangeFilter: FilterFn<any> = (row, columnId, filterValue) => {
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
  interface ColumnMeta<TData extends unknown, TValue> {
    fixed?: boolean;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  onRowClick?: (row: TData) => void
  showColumnVisibility?: boolean
  showPagination?: boolean
  showFilter?: boolean
  columnFilters?: {
    [key: string]: {
      type: 'text' | 'select' | 'number' | 'date'
      options?: { label: string; value: string }[]
      label?: string
    }
  }
  defaultColumnVisibility?: VisibilityState
  viewType?: ViewType
  translations?: {
    columns?: string
    filters?: string
    previous?: string
    next?: string
    noResults?: string
    to?: string
  }
  actions?: (row: TData) => React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder,
  onRowClick,
  showColumnVisibility = true,
  showPagination = true,
  showFilter = true,
  columnFilters = {},
  defaultColumnVisibility = {},
  viewType,
  translations,
  actions,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations('dataTable')
  const locale = useLocale()
  const dateLocale = locale === 'de' ? de : enUS

  // Get the table store
  const { getState, setState } = useTableStore()

  // Initialize state from store if viewType is provided
  const storedState = viewType ? getState(viewType) : null
  const [sorting, setSorting] = useState<SortingState>(storedState?.sorting || [])
  const [columnFiltersState, setColumnFilters] = useState<ColumnFiltersState>(storedState?.columnFilters || [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ ...defaultColumnVisibility, ...storedState?.columnVisibility, })
  const [rowSelection, setRowSelection] = useState({})
  const [showColumnFilters, setShowColumnFilters] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [globalFilter, setGlobalFilter] = useState(storedState?.globalFilter || '')
  const [pageSize, setPageSize] = useState(storedState?.pageSize || 10)
  const [viewRefreshTrigger, setViewRefreshTrigger] = useState(0)

  // Update store when state changes
  useEffect(() => {
    if (viewType) {
      setState(viewType, {
        sorting,
        columnFilters: columnFiltersState,
        columnVisibility,
        globalFilter,
        pageSize,
      })
    }
  }, [viewType, sorting, columnFiltersState, columnVisibility, globalFilter, pageSize, setState])

  // Function to check if any filters are active
  const hasActiveFilters = () => {
    // Check if any column filters are active
    const hasColumnFilters = columnFiltersState.some(filter => {
      const value = filter.value;
      if (Array.isArray(value)) {
        // For range filters (number, date)
        return value.some(v => v !== undefined && v !== '');
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters: columnFiltersState,
      columnVisibility,
      rowSelection,
      globalFilter,
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
    pageCount: Math.ceil(data.length / pageSize),

  })

  // Function to save the current view
  const handleSaveView = async (name: string, isDefault: boolean) => {
    if (!viewType) return

    setIsSaving(true)
    try {
      // Convert the data to a JSON-compatible format
      const viewData = {
        sorting: JSON.parse(JSON.stringify(sorting)),
        columnFilters: JSON.parse(JSON.stringify(columnFiltersState)),
        columnVisibility: JSON.parse(JSON.stringify(columnVisibility)),
        globalFilter,
        pageSize,
      }

      // Use type assertion to satisfy the TypeScript compiler
      const { view, error } = await createView({
        name,
        type: viewType,
        isDefault,
        data: viewData
      } as any)

      if (error) {
        throw new Error(error)
      }

      // Refresh the view list
      setViewRefreshTrigger(prev => prev + 1)
    } catch (err) {
      console.error('Error saving view:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadView = async (view: any) => {
    if (!view) return

    try {
      const { view: loadedView, error } = await getViewById(view.id)
      if (error) {
        throw new Error(error)
      }

      if (loadedView && loadedView.data) {
        // Parse the data if it's a string, or use it directly if it's already an object
        const state = typeof loadedView.data === 'string'
          ? JSON.parse(loadedView.data)
          : loadedView.data as {
            sorting?: SortingState;
            columnFilters?: ColumnFiltersState;
            columnVisibility?: VisibilityState;
            globalFilter?: string;
            pageSize?: number;
          };

        setSorting(state.sorting || [])
        setColumnFilters(state.columnFilters || [])
        setColumnVisibility(state.columnVisibility || defaultColumnVisibility)
        setGlobalFilter(state.globalFilter || '')
        setPageSize(state.pageSize || 10)
      }
    } catch (err) {
      console.error('Error loading view:', err)
    }
  }

  const handleDeleteView = async (viewId: string) => {
    try {
      const { error } = await deleteView(viewId)
      if (error) {
        throw new Error(error)
      }

      // Refresh the view list
      setViewRefreshTrigger(prev => prev + 1)
    } catch (err) {
      console.error('Error deleting view:', err)
    }
  }

  return (
    <div>
      <DataTableHeader
        table={table}
        filterColumn={filterColumn}
        filterPlaceholder={filterPlaceholder}
        showColumnVisibility={showColumnVisibility}
        showFilter={showFilter}
        columnFilters={columnFilters}
        viewType={viewType}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        showColumnFilters={showColumnFilters}
        setShowColumnFilters={setShowColumnFilters}
        hasActiveFilters={hasActiveFilters}
        isSaving={isSaving}
        handleSaveView={handleSaveView}
        viewRefreshTrigger={viewRefreshTrigger}
      />

      {showColumnFilters && Object.keys(columnFilters).length > 0 && (
        <DataTableColumnFilters
          table={table}
          columnFilters={columnFilters}
        />
      )}

      <DataTableBody
        table={table}
        onRowClick={onRowClick}
      />

      {showPagination && (
        <DataTablePagination table={table} />
      )}
    </div>
  )
} 