'use client';

import type { Table } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { DataTableColumnFilters } from '@/components/ui/data-table';
import { exportTableToExcel, type ExportColumnScope } from '@/lib/table-export/export-table-to-excel';

interface DataTableExportDialogProps<TData> {
  table: Table<TData>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnFilters?: DataTableColumnFilters;
  exportPrefix?: string;
}

export function DataTableExportDialog<TData>({
  table,
  open,
  onOpenChange,
  columnFilters = {},
  exportPrefix,
}: DataTableExportDialogProps<TData>) {
  const t = useTranslations('dataTable');
  const [columnScope, setColumnScope] = useState<ExportColumnScope>('visible');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportTableToExcel({
        table,
        columnScope,
        columnFilters,
        exportPrefix,
      });
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('exportDialog.title')}</DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={columnScope}
          onValueChange={(value) => setColumnScope(value as ExportColumnScope)}
          className="gap-4"
        >
          <div className="flex items-center gap-3">
            <RadioGroupItem value="visible" id="export-visible-columns" />
            <Label htmlFor="export-visible-columns" className="font-normal">
              {t('exportDialog.visibleColumns')}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <RadioGroupItem value="all" id="export-all-columns" />
            <Label htmlFor="export-all-columns" className="font-normal">
              {t('exportDialog.allColumns')}
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            {t('exportDialog.cancel')}
          </Button>
          <Button type="button" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? t('exportDialog.exporting') : t('exportDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
