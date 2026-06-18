'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { TableViewColumnConfig } from '@/types/dashboard-widgets/table-view';

export type TableViewColumnMeta = {
  id: string;
  label: string;
};

export function TableViewColumnEditor({
  columns,
  columnMeta,
  onChange,
}: {
  columns: TableViewColumnConfig[];
  columnMeta: TableViewColumnMeta[];
  onChange: (columns: TableViewColumnConfig[]) => void;
}) {
  const t = useTranslations('dashboard.customizer.tableView');

  const orderedColumns = (() => {
    const knownIds = new Set(columns.map((col) => col.id));
    const ordered = [...columns];
    for (const meta of columnMeta) {
      if (!knownIds.has(meta.id)) {
        ordered.push({ id: meta.id, visible: false });
      }
    }
    return ordered;
  })();

  const moveColumn = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedColumns.length) {
      return;
    }
    const next = [...orderedColumns];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  };

  const toggleVisible = (id: string, visible: boolean) => {
    onChange(orderedColumns.map((col) => (col.id === id ? { ...col, visible } : col)));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t('columns')}</Label>
      <div className="space-y-1">
        {orderedColumns.map((column, index) => {
          const meta = columnMeta.find((item) => item.id === column.id);
          if (!meta) {
            return null;
          }

          return (
            <div key={column.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <Checkbox
                id={`column-${column.id}`}
                checked={column.visible}
                onCheckedChange={(checked) => toggleVisible(column.id, checked === true)}
              />
              <Label htmlFor={`column-${column.id}`} className="min-w-0 flex-1 truncate text-xs font-normal">
                {meta.label}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={index === 0}
                onClick={() => moveColumn(index, -1)}
                aria-label={t('moveUp')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={index === orderedColumns.length - 1}
                onClick={() => moveColumn(index, 1)}
                aria-label={t('moveDown')}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
