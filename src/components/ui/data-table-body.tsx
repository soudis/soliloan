import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Ignore accidental row navigation shortly after the row-actions dropdown closes (ghost click-through). */
const ROW_CLICK_SUPPRESS_MS_AFTER_ACTIONS_MENU = 400;

interface DataTableBodyProps<TData> {
  table: TanstackTable<TData>;
  /** When set, rows use transparent hover — cell backgrounds mirror selection only (no muted hover tint). */
  onRowClick?: (row: TData) => void;
  hasBulkSelect?: boolean;
  lastRowActionsMenuClosedAtRef?: RefObject<number>;
}

function nonActionsCellBg(onRowClick: boolean | undefined) {
  const base = 'bg-background transition-colors';
  const selected = 'group-data-[state=selected]/row:bg-muted';
  if (onRowClick) {
    return cn(base, selected);
  }
  return cn(base, 'group-hover/row:bg-muted/50', selected);
}

export function DataTableBody<TData>({
  table,
  onRowClick,
  hasBulkSelect,
  lastRowActionsMenuClosedAtRef,
}: DataTableBodyProps<TData>) {
  const t = useTranslations('dataTable');

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.columnDef.meta?.style?.textAlign &&
                        `text-${header.column.columnDef.meta.style.textAlign}`,
                      'bg-background',
                      header.column.columnDef.meta?.fixed &&
                        'sticky right-0 z-10 before:absolute before:left-0 before:top-0 before:h-full before:w-[1px] before:bg-border before:content-[""]',
                      header.column.columnDef.meta?.bulkSelectColumn &&
                        'relative w-10 min-w-[2.5rem] max-w-[2.5rem] !p-0 text-center align-middle',
                      header.column.columnDef.meta?.actionsColumn &&
                        'w-9 min-w-[2.25rem] max-w-[2.25rem] !p-0 text-center align-middle',
                    )}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
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
                className={cn(
                  'group/row transition-colors',
                  onRowClick &&
                    'data-table-clickable-row cursor-pointer hover:bg-transparent data-[state=selected]:hover:bg-muted',
                )}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  // Prevent row click when clicking the bulk select checkbox
                  if (hasBulkSelect && target.closest('[data-bulk-select]')) return;
                  // Prevent row click when opening/using the row actions trigger (…)
                  if (target.closest('[data-row-actions]')) return;
                  // Portaled row-actions menu / menu items are not under the row; ghost click can still hit the row
                  if (
                    e.nativeEvent.composedPath().some((node) => {
                      if (!(node instanceof HTMLElement)) return false;
                      return (
                        node.getAttribute('role') === 'menu' ||
                        node.getAttribute('role') === 'menuitem' ||
                        node.hasAttribute('data-row-actions-menu-content')
                      );
                    })
                  ) {
                    return;
                  }
                  if (
                    lastRowActionsMenuClosedAtRef &&
                    Date.now() - lastRowActionsMenuClosedAtRef.current < ROW_CLICK_SUPPRESS_MS_AFTER_ACTIONS_MENU
                  ) {
                    return;
                  }
                  onRowClick?.(row.original);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    {...(cell.column.columnDef.meta?.actionsColumn ? { 'data-actions-cell': '' } : {})}
                    {...(cell.column.columnDef.meta?.bulkSelectColumn ? { 'data-bulk-select-cell': '' } : {})}
                    className={cn(
                      nonActionsCellBg(!!onRowClick),
                      cell.column.columnDef.meta?.fixed &&
                        'sticky right-0 z-10 before:absolute before:left-0 before:top-0 before:h-full before:w-[1px] before:bg-border before:content-[""]',
                      cell.column.columnDef.meta?.bulkSelectColumn &&
                        'relative w-10 min-w-[2.5rem] max-w-[2.5rem] !p-0 align-top leading-none',
                      cell.column.columnDef.meta?.actionsColumn &&
                        'w-9 min-w-[2.25rem] max-w-[2.25rem] !p-0 align-top leading-none',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-24 bg-background text-center dark:bg-background"
              >
                {t('noResults')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
