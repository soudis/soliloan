'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';

import type { DashboardLayoutRow } from '@/types/dashboard-layout';

import { useDashboardLayout } from './dashboard-layout-context';
import { DashboardWidgetSlot } from './dashboard-widget-slot';

export function DashboardGridRow({ row }: { row: DashboardLayoutRow }) {
  const t = useTranslations('dashboard.customizer');
  const { isCustomizing } = useDashboardLayout();
  const { setNodeRef, isOver } = useDroppable({
    id: `row-${row.id}`,
    data: { kind: 'row', rowId: row.id },
    disabled: !isCustomizing,
  });

  const widgetIds = row.widgets.map((w) => w.id);

  return (
    <div
      ref={setNodeRef}
      className={`grid grid-cols-2 gap-4 p-0.5 md:grid-cols-4 ${isOver && isCustomizing ? 'rounded-lg border-2 border-dashed border-primary/50' : ''}`}
    >
      <SortableContext items={widgetIds} strategy={horizontalListSortingStrategy}>
        {row.widgets.map((widget) => (
          <DashboardWidgetSlot key={widget.id} widget={widget} rowId={row.id} />
        ))}
      </SortableContext>
      {row.widgets.length === 0 && isCustomizing && (
        <div className="col-span-2 flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 md:col-span-4">
          <span className="text-xs text-muted-foreground">{t('dropHere')}</span>
        </div>
      )}
    </div>
  );
}
