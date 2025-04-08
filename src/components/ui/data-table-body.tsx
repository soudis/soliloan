import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Table as TanstackTable, flexRender } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'

interface DataTableBodyProps<TData> {
  table: TanstackTable<TData>
  onRowClick?: (row: TData) => void
}

export function DataTableBody<TData>({
  table,
  onRowClick,
}: DataTableBodyProps<TData>) {
  const t = useTranslations('dataTable')

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
                    className={header.column.columnDef.meta?.fixed ? 'sticky right-0 bg-background z-10 before:content-[""] before:absolute before:left-0 before:top-0 before:h-full before:w-[1px] before:bg-border' : ''}
                  >
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
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.fixed ? 'sticky right-0 bg-background z-10 before:content-[""] before:absolute before:left-0 before:top-0 before:h-full before:w-[1px] before:bg-border' : ''}
                  >
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
                colSpan={table.getAllColumns().length}
                className="h-24 text-center"
              >
                {t('noResults')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
} 