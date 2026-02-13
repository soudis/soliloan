'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { BulkAction } from './data-table';
import { Button } from './button';

interface DataTableBulkBarProps {
  selectedCount: number;
  selectedIds: string[];
  bulkActions: BulkAction[];
  onComplete: () => void;
}

export function DataTableBulkBar({ selectedCount, selectedIds, bulkActions, onComplete }: DataTableBulkBarProps) {
  const t = useTranslations('dataTable');

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 mb-2">
      <span className="text-sm text-muted-foreground">
        {t('bulkBar.selected', { count: selectedCount })}
      </span>

      <div className="flex items-center gap-2">
        {bulkActions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'outline'}
            size="sm"
            onClick={() => action.onClick(selectedIds)}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>

      <Button variant="ghost" size="sm" className="ml-auto" onClick={onComplete}>
        <X className="h-4 w-4" />
        <span className="sr-only">{t('bulkBar.deselect')}</span>
      </Button>
    </div>
  );
}
