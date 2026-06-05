'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { applyTableView, sortTableRows } from '@/lib/dashboard/table-widget/apply-table-view';
import { cn } from '@/lib/utils';
import type { TableViewSort, TableViewWidgetConfigBase } from '@/types/dashboard-widgets/table-view';

type TableViewWidgetProps<T> = {
  config: TableViewWidgetConfigBase;
  rows: T[];
  columns: ColumnDef<T>[];
  emptyMessage: string;
  getSortValue: (row: T, columnId: string) => string | number | Date | null | undefined;
  onRowClick?: (row: T) => void;
};

function resolveColumnId<T>(column: ColumnDef<T>): string {
  if (column.id) {
    return column.id;
  }
  const accessorKey = 'accessorKey' in column ? column.accessorKey : undefined;
  if (typeof accessorKey === 'string') {
    return accessorKey.replaceAll('.', '_');
  }
  return '';
}

export function TableViewWidget<T>({
  config,
  rows,
  columns,
  emptyMessage,
  getSortValue,
  onRowClick,
}: TableViewWidgetProps<T>) {
  const t = useTranslations('dashboard.widgets.tableView');
  const [sortOverride, setSortOverride] = useState<TableViewSort>(null);
  const [pageIndex, setPageIndex] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset interactive sort/pagination when widget config changes
  useEffect(() => {
    setSortOverride(null);
    setPageIndex(0);
  }, [config.columns, config.filters, config.defaultSort, config.displayMode, config.rowLimit]);

  const effectiveSort = sortOverride ?? config.defaultSort;

  const columnById = useMemo(() => {
    const map = new Map<string, ColumnDef<T>>();
    for (const column of columns) {
      const id = resolveColumnId(column);
      if (id) {
        map.set(id, column);
      }
    }
    return map;
  }, [columns]);

  const visibleColumns = useMemo(() => {
    const ordered = config.columns
      .filter((col) => col.visible)
      .map((col) => columnById.get(col.id))
      .filter((col): col is ColumnDef<T> => Boolean(col));

    if (ordered.length > 0) {
      return ordered;
    }

    return columns;
  }, [config.columns, columnById, columns]);

  const filteredSortedRows = useMemo(() => {
    return sortTableRows(rows, effectiveSort, getSortValue);
  }, [rows, effectiveSort, getSortValue]);

  const displayRows = useMemo(() => {
    if (config.displayMode === 'fixed') {
      return applyTableView({
        rows: filteredSortedRows,
        sort: null,
        displayMode: 'fixed',
        rowLimit: config.rowLimit,
        getSortValue,
      });
    }
    return filteredSortedRows;
  }, [filteredSortedRows, config.displayMode, config.rowLimit, getSortValue]);

  const sorting: SortingState = effectiveSort
    ? [{ id: effectiveSort.columnId, desc: effectiveSort.desc }]
    : [];

  const table = useReactTable({
    data: displayRows,
    columns: visibleColumns,
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize: config.rowLimit,
      },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      if (next.length === 0) {
        setSortOverride(null);
        return;
      }
      const first = next[0];
      setSortOverride({ columnId: first.id, desc: first.desc ?? false });
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex, pageSize: config.rowLimit };
      const next = typeof updater === 'function' ? updater(current) : updater;
      setPageIndex(next.pageIndex);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: config.displayMode === 'paged' ? getPaginationRowModel() : undefined,
    manualSorting: true,
    pageCount: config.displayMode === 'paged' ? Math.ceil(displayRows.length / config.rowLimit) : 1,
    autoResetPageIndex: false,
  });

  if (displayRows.length === 0) {
    return <p className="px-1 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="max-h-80 overflow-auto">
        <Table containerClassName="overflow-visible">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={(header.column.columnDef.meta as { style?: CSSProperties })?.style}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={(cell.column.columnDef.meta as { style?: CSSProperties })?.style}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {config.displayMode === 'paged' && displayRows.length > config.rowLimit ? (
        <DataTablePagination
          table={table}
          onPageSizeChange={() => {
            setPageIndex(0);
          }}
        />
      ) : null}
      {config.displayMode === 'fixed' && displayRows.length >= config.rowLimit ? (
        <p className="mt-2 text-xs text-muted-foreground">{t('fixedLimitHint', { count: config.rowLimit })}</p>
      ) : null}
    </div>
  );
}
