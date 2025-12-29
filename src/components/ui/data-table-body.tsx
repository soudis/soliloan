import { type Table as TanstackTable, flexRender } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableBodyProps<TData> {
  table: TanstackTable<TData>;
  onRowClick?: (row: TData) => void;
}

export function DataTableBody<TData>({ table, onRowClick }: DataTableBodyProps<TData>) {
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
                      header.column.columnDef.meta?.fixed &&
                        'sticky right-0 z-10 bg-background before:absolute before:left-0 before:top-0 before:h-full before:w-[1px] before:bg-border before:content-[""]',
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
                className={cn('group/row transition-colors', onRowClick ? 'cursor-pointer' : '')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.columnDef.meta?.fixed &&
                        'sticky right-0 z-10 bg-background transition-colors data-[state=selected]:bg-muted before:absolute before:left-0 before:top-0 before:h-full before:w-[1px] before:bg-border before:content-[""]',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                {t('noResults')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
