'use client';

import { useDroppable } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { memo, useMemo } from 'react';

import { cn } from '@/lib/utils';
import type { DashboardLayoutRow } from '@/types/dashboard-layout';

import { useDashboardEditor } from './dashboard-layout-context';
import { DashboardWidgetSlot } from './dashboard-widget-slot';

function DashboardGridRowComponent({ row }: { row: DashboardLayoutRow }) {
  const t = useTranslations('dashboard.customizer');
  const { isCustomizing } = useDashboardEditor();
  const { setNodeRef, isOver } = useDroppable({
    id: `row-drop-${row.id}`,
    data: { kind: 'row', rowId: row.id },
    disabled: !isCustomizing,
  });

  const widgetIds = useMemo(() => row.widgets.map((w) => w.id), [row.widgets]);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-12 gap-4 p-0.5">
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          {row.widgets.map((widget) => (
            <DashboardWidgetSlot key={widget.id} widget={widget} rowId={row.id} />
          ))}
        </SortableContext>
      </div>
      {isCustomizing ? (
        <div
          ref={setNodeRef}
          className={cn(
            'flex items-center justify-center rounded-lg border border-dashed transition-colors',
            row.widgets.length === 0 ? 'min-h-[80px]' : 'min-h-10',
            isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30',
          )}
        >
          <span className="text-xs text-muted-foreground">
            {row.widgets.length === 0 ? t('dropHere') : t('dropRowEnd')}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const DashboardGridRow = memo(DashboardGridRowComponent);
