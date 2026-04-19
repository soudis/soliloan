import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPaginationItems } from '@/lib/pagination-range';
import { cn } from '@/lib/utils';

/** Matches data-table-header toolbar: outline + sm + h-8 (filters, columns, views). */
const headerBtnSquare = 'h-8 w-8 shrink-0 p-0';

const PAGE_SIZE_PRESETS = [10, 25, 50, 100] as const;

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  /** Persist via URL (`pageSize`) and reset to first page. */
  onPageSizeChange: (pageSize: number) => void;
}

export function DataTablePagination<TData>({ table, onPageSizeChange }: DataTablePaginationProps<TData>) {
  const t = useTranslations('dataTable');
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const currentPage = pageIndex + 1;
  const items = getPaginationItems(pageCount, currentPage, 1);

  const pageSizeOptions = useMemo(() => {
    const merged = new Set<number>(PAGE_SIZE_PRESETS);
    merged.add(pageSize);
    return [...merged].sort((a, b) => a - b);
  }, [pageSize]);

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="data-table-page-size" className="whitespace-nowrap font-normal text-muted-foreground">
            {t('rowsPerPage')}
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const next = Number(value);
              if (next !== pageSize) onPageSizeChange(next);
            }}
          >
            <SelectTrigger id="data-table-page-size" className="h-8 w-[5.25rem] shrink-0 text-sm md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <nav
        className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t('paginationNav')}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={headerBtnSquare}
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label={t('firstPage')}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={headerBtnSquare}
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t('previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {items.map((item, i) =>
          item === 'ellipsis' ? (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static list; order stable per render
              key={`e-${i}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center text-sm text-muted-foreground select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              type="button"
              key={item}
              variant={item === currentPage ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 min-w-8 shrink-0 px-0 font-normal tabular-nums',
                item === currentPage && 'pointer-events-none',
              )}
              onClick={() => table.setPageIndex(item - 1)}
              aria-label={t('goToPage', { page: item })}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={headerBtnSquare}
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={headerBtnSquare}
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          aria-label={t('lastPage')}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
