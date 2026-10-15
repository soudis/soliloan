'use client';

import type { Table } from '@tanstack/react-table';
import { Check, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo, useState } from 'react';
import type { ColumnGroupKey, DataTableColumnFilters } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TableUrlState } from '@/lib/hooks/use-table-url-state';
import { buildFilterFieldMenuGroups, type FilterFieldColumn } from '@/lib/table-filter-field-groups';
import { getUntakenFilterColumnIds, resolveColumnChooserLabel } from '@/lib/table-filter-presence';

export function DataTableFilterFieldMenu<TData>({
  table,
  columnFilters,
  tableState,
  includeColumnId,
  onSelect,
  onRemove,
  trigger,
}: {
  table: Table<TData>;
  columnFilters: DataTableColumnFilters;
  tableState: TableUrlState;
  includeColumnId?: string;
  onSelect: (columnId: string) => void;
  onRemove?: () => void;
  trigger: ReactNode;
}) {
  const t = useTranslations('dataTable');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const availableIds = useMemo(
    () => new Set(getUntakenFilterColumnIds(table, columnFilters, tableState, includeColumnId)),
    [table, columnFilters, tableState, includeColumnId],
  );

  const columns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const descriptors: FilterFieldColumn[] = [];
    for (const column of table.getAllLeafColumns()) {
      if (!availableIds.has(column.id)) {
        continue;
      }
      const label = resolveColumnChooserLabel(table, column.id, columnFilters);
      if (query && !label.toLowerCase().includes(query)) {
        continue;
      }
      const group = column.columnDef.meta?.columnGroup;
      descriptors.push({
        id: column.id,
        visible: tableState.columnVisibility[column.id] !== false && column.getIsVisible(),
        groupKey: group?.key ?? null,
        groupOrder: group?.order ?? 0,
      });
    }
    return descriptors;
  }, [table, columnFilters, tableState.columnVisibility, availableIds, searchQuery]);

  const groups = useMemo(() => buildFilterFieldMenuGroups(columns), [columns]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearchQuery('');
        }
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-0">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={tCommon('ui.actions.search')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
        </div>
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto p-1">
          {groups.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{tCommon('ui.actions.noResults')}</div>
          ) : (
            groups.map((group, index) => (
              <div key={group.key}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                {group.key === 'shown' ? <DropdownMenuLabel>{t('columnGroups.shown')}</DropdownMenuLabel> : null}
                {group.key !== 'shown' && group.key !== 'ungrouped' ? (
                  <DropdownMenuLabel>{t(`columnGroups.${group.key as ColumnGroupKey}`)}</DropdownMenuLabel>
                ) : null}
                {group.columnIds.map((columnId) => (
                  <DropdownMenuItem key={columnId} onSelect={() => onSelect(columnId)}>
                    <span className="min-w-0 flex-1 truncate">
                      {resolveColumnChooserLabel(table, columnId, columnFilters)}
                    </span>
                    {columnId === includeColumnId ? <Check className="ml-auto size-4 shrink-0" /> : null}
                  </DropdownMenuItem>
                ))}
              </div>
            ))
          )}
          {onRemove ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onRemove}>
                <X className="size-3.5" />
                {t('removeFilter')}
              </DropdownMenuItem>
            </>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
