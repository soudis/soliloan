'use client';

import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useFilterPresence } from '@/components/ui/data-table-filter-presence-context';
import { cn } from '@/lib/utils';

/** Set to true when column reordering via header arrows is implemented. */
const SHOW_MOVE_COLUMN_BUTTONS = false;
/** Set to true when the column more-options menu is implemented. */
const SHOW_MORE_OPTIONS_BUTTON = false;

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  /** Short name shown in the table header. */
  title: string;
  /** Long name shown in the column menu. Defaults to `title`. */
  longTitle?: string;
  /** Optional explanation shown under the long name. */
  description?: string;
}

type MoveButtonCoords = {
  top: number;
  left: number;
  right: number;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  longTitle,
  description,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const t = useTranslations('dataTable.columnMenu');
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MoveButtonCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();
  const resolvedLongTitle = longTitle ?? title;
  const showMoveButtons = SHOW_MOVE_COLUMN_BUTTONS && open;
  const filterPresence = useFilterPresence();
  const canFilter = !!filterPresence?.config[column.id];
  const filterPresent = canFilter ? filterPresence.isPresent(column.id) : false;

  useLayoutEffect(() => {
    if (!showMoveButtons) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.left,
        right: rect.right,
      });
    };

    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [showMoveButtons]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn('relative flex w-full items-center justify-start', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            aria-expanded={open}
            className={cn(
              'my-1.5 h-8 w-full justify-start gap-0.5 pl-1 pr-3 has-[>svg]:px-0 has-[>svg]:pl-1 has-[>svg]:pr-3 text-sm font-medium data-[state=open]:bg-accent',
              open && 'bg-accent text-accent-foreground',
            )}
          >
            <ChevronDown className="size-3 shrink-0 opacity-40" />
            <span className="min-w-0 truncate">{title}</span>
            {sorted === 'asc' ? (
              <ArrowUp className="size-3 shrink-0 opacity-70" />
            ) : sorted === 'desc' ? (
              <ArrowDown className="size-3 shrink-0 opacity-70" />
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-80 px-3 pb-5 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-sm font-semibold leading-snug">{resolvedLongTitle}</div>
              {description ? <p className="text-sm text-muted-foreground leading-relaxed">{description}</p> : null}
            </div>
            {SHOW_MORE_OPTIONS_BUTTON ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled
                aria-label={t('moreOptions')}
                className="size-8 shrink-0 text-muted-foreground"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            ) : null}
          </div>

          {canSort ? (
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{t('sort')}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant={sorted === 'desc' ? 'secondary' : 'outline'}
                  size="icon"
                  aria-label={t('sortDesc')}
                  className="size-8"
                  onClick={() => column.toggleSorting(true)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={sorted === 'asc' ? 'secondary' : 'outline'}
                  size="icon"
                  aria-label={t('sortAsc')}
                  className="size-8"
                  onClick={() => column.toggleSorting(false)}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {canFilter ? (
            <div className={cn('flex items-center justify-between gap-3', canSort ? 'mt-4' : 'mt-5')}>
              <span className="text-sm text-muted-foreground">{t('filter')}</span>
              <Switch
                checked={filterPresent}
                onCheckedChange={(checked) => {
                  filterPresence?.setPresent(column.id, checked);
                }}
                aria-label={t('filter')}
              />
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      {mounted && showMoveButtons && coords
        ? createPortal(
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                aria-label={t('moveLeft')}
                className="pointer-events-none fixed z-[60] size-6 -translate-x-full -translate-y-1/2 rounded-full border-border/60 bg-background text-muted-foreground opacity-70 shadow-sm"
                style={{ top: coords.top, left: coords.left - 4 }}
              >
                <ArrowLeft className="size-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                aria-label={t('moveRight')}
                className="pointer-events-none fixed z-[60] size-6 -translate-y-1/2 rounded-full border-border/60 bg-background text-muted-foreground opacity-70 shadow-sm"
                style={{ top: coords.top, left: coords.right + 4 }}
              >
                <ArrowRight className="size-3" />
              </Button>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
