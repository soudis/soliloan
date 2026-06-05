'use client';

import { useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { addRow } from '@/lib/dashboard/layout-editor';

import { useDashboardLayout } from './dashboard-layout-context';
import { DashboardGridRow } from './dashboard-grid-row';

export function DashboardGrid() {
  const t = useTranslations('dashboard.customizer');
  const { layout, setLayout, isCustomizing } = useDashboardLayout();

  const { setNodeRef, isOver } = useDroppable({
    id: 'new-row',
    data: { kind: 'new-row' },
    disabled: !isCustomizing,
  });

  return (
    <div className="flex flex-col gap-6 pt-1">
      {layout.rows.map((row) => (
        <DashboardGridRow key={row.id} row={row} />
      ))}

      {isCustomizing && (
        <div className="flex flex-col gap-2">
          <div
            ref={setNodeRef}
            className={`flex min-h-[64px] items-center justify-center rounded-lg border border-dashed ${
              isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
            }`}
          >
            <span className="text-xs text-muted-foreground">{t('dropNewRow')}</span>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setLayout(addRow(layout))}>
            {t('addRow')}
          </Button>
        </div>
      )}
    </div>
  );
}
