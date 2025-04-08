import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { SaveViewDialog } from './save-view-dialog'
import { ViewManager } from './view-manager'

// Define the custom filter function for compound text fields
const compoundTextFilter: FilterFn<any> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!value) return false;

  // Convert both the value and filter to lowercase for case-insensitive search
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();

  return searchValue.includes(searchFilter);
};

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
  viewType?: 'LENDER' | 'LOAN'
  translations?: {
    columns?: string
    filters?: string
    previous?: string
    next?: string
    noResults?: string
    to?: string
  }
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
}: DataTableProps<TData, TValue>) {
  const t = useTranslations('dataTable')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFiltersState, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility)
  const [rowSelection, setRowSelection] = useState({})
  const [showColumnFilters, setShowColumnFilters] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [globalFilter, setGlobalFilter] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [viewRefreshTrigger, setViewRefreshTrigger] = useState(0)

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

  const table = useReactTable({
    data,
    columns,
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
    // Register the custom filter function
    filterFns: {
      compoundText: compoundTextFilter,
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
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({
          pageIndex: 0,
          pageSize,
        })
        setPageSize(newState.pageSize)
      } else {
        setPageSize(updater.pageSize)
      }
    },
  })

  // Function to save the current view
  const handleSaveView = async (name: string, isDefault: boolean) => {
    if (!viewType) return;

    try {
      setIsSaving(true);

      const viewData = {
        type: viewType,
        name,
        data: {
          columnVisibility,
          sorting,
          columnFilters: columnFiltersState,
          globalFilter,
          pageSize,
        },
      };

      const response = await fetch('/api/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viewData),
      });

      if (!response.ok) {
        throw new Error('Failed to save view');
      }

      // Increment the refresh trigger to cause the ViewManager to refresh
      setViewRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error saving view:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to load a view
  const handleLoadView = (view: any) => {
    if (view === null) {
      // Reset to default state
      setColumnVisibility(defaultColumnVisibility);
      setSorting([]);
      setColumnFilters([]);
      setGlobalFilter('');
      setPageSize(10);
      return;
    }

    if (!view.data) return;

    const { columnVisibility: newColumnVisibility, sorting: newSorting, columnFilters: newColumnFilters, globalFilter: newGlobalFilter, pageSize: newPageSize } = view.data;

    if (newColumnVisibility) setColumnVisibility(newColumnVisibility);
    if (newSorting) setSorting(newSorting);
    if (newColumnFilters) setColumnFilters(newColumnFilters);
    if (newGlobalFilter !== undefined) setGlobalFilter(newGlobalFilter);
    if (newPageSize) setPageSize(newPageSize);
  };

  // Function to delete a view
  const handleDeleteView = async (viewId: string) => {
    try {
      const response = await fetch(`/api/views/${viewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete view');
      }
    } catch (error) {
      console.error('Error deleting view:', error);
    }
  };

  return (
    <div>
      <div className="flex items-center py-4">
        {showFilter && (
          <div className="flex items-center gap-4">
            {filterColumn && (
              <Input
                placeholder={filterPlaceholder}
                value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn(filterColumn)?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
            )}
            <Input
              placeholder={t('globalFilter') || "Search all columns..."}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
        <div className="ml-auto flex items-center space-x-2">
          {viewType && (
            <>
              <ViewManager
                viewType={viewType}
                onViewSelect={handleLoadView}
                onViewDelete={handleDeleteView}
                refreshTrigger={viewRefreshTrigger}
              />
              <SaveViewDialog
                viewType={viewType}
                onSave={handleSaveView}
                isLoading={isSaving}
              />
            </>
          )}
          {Object.keys(columnFilters).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setShowColumnFilters(!showColumnFilters)}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {t('filters')}
              {hasActiveFilters() && (
                <span className="ml-2 flex h-2 w-2 rounded-full bg-primary"></span>
              )}
            </Button>
          )}
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8">
                  {t('columns')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {columnFilters[column.id]?.label || column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {showColumnFilters && Object.keys(columnFilters).length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(columnFilters).map(([columnId, filterConfig]) => {
            const column = table.getColumn(columnId)
            if (!column) return null

            return (
              <div key={columnId} className="flex flex-col space-y-2">
                <span className="text-sm font-medium">{filterConfig.label || columnId}:</span>
                <div className="flex items-center space-x-2">
                  {filterConfig.type === 'select' ? (
                    <select
                      className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={(column.getFilterValue() as string) ?? ''}
                      onChange={(e) => column.setFilterValue(e.target.value)}
                    >
                      <option value="">All</option>
                      {filterConfig.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : filterConfig.type === 'number' ? (
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={(column.getFilterValue() as [number, number])?.[0] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : undefined
                          const current = column.getFilterValue() as [number, number] | undefined
                          column.setFilterValue([value, current?.[1]])
                        }}
                        className="h-8 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-sm whitespace-nowrap">{t('to')}</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={(column.getFilterValue() as [number, number])?.[1] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : undefined
                          const current = column.getFilterValue() as [number, number] | undefined
                          column.setFilterValue([current?.[0], value])
                        }}
                        className="h-8 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ) : filterConfig.type === 'date' ? (
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        type="date"
                        value={(column.getFilterValue() as [string, string])?.[0] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value || undefined
                          const current = column.getFilterValue() as [string, string] | undefined
                          column.setFilterValue([value, current?.[1]])
                        }}
                        className="h-8 w-[130px]"
                      />
                      <span className="text-sm">{t('to')}</span>
                      <Input
                        type="date"
                        value={(column.getFilterValue() as [string, string])?.[1] ?? ''}
                        onChange={(e) => {
                          const value = e.target.value || undefined
                          const current = column.getFilterValue() as [string, string] | undefined
                          column.setFilterValue([current?.[0], value])
                        }}
                        className="h-8 w-[130px]"
                      />
                    </div>
                  ) : (
                    <Input
                      placeholder={`Filter ${filterConfig.label || columnId}...`}
                      value={(column.getFilterValue() as string) ?? ''}
                      onChange={(event) => column.setFilterValue(event.target.value)}
                      className="h-8 w-full"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t('previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('next')}
          </Button>
        </div>
      )}
    </div>
  )
} 