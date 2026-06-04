'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart3,
  Hash,
  LineChart,
  PieChart,
  Table2,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getWidgetColSpanClassName } from '@/lib/dashboard/layout-utils';
import type { DashboardWidget, DashboardWidgetType } from '@/types/dashboard-layout';

import { HistoryTableWidget } from '../widgets/history-table-widget';
import { StatWidget } from '../widgets/stat-widget';
import { useDashboardLayout } from './dashboard-layout-context';

const WIDGET_ICONS: Record<DashboardWidgetType, React.ComponentType<{ className?: string }>> = {
  history_table: Table2,
  pie_chart: PieChart,
  line_chart: LineChart,
  bar_chart: BarChart3,
  stat: Hash,
  loan_table_view: Table2,
  lender_table_view: Users,
};

export function DashboardWidgetSlot({ widget, rowId }: { widget: DashboardWidget; rowId: string }) {
  const t = useTranslations('dashboard.customizer');
  const { isCustomizing, selectedWidgetId, setSelectedWidgetId } = useDashboardLayout();
  const isSelected = selectedWidgetId === widget.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    data: { kind: 'widget', rowId, widgetId: widget.id },
    disabled: !isCustomizing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = WIDGET_ICONS[widget.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getWidgetColSpanClassName(widget.width),
        'touch-none min-w-0 p-0.5',
        isDragging && 'opacity-40',
      )}
    >
      <Card
        className={cn(
          'h-full min-h-[120px] border-2 shadow-sm',
          isSelected && isCustomizing ? 'border-primary' : 'border-border',
          isCustomizing && 'cursor-pointer',
        )}
        onClick={() => {
          if (isCustomizing) {
            setSelectedWidgetId(widget.id);
          }
        }}
      >
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          {isCustomizing && (
            <button
              type="button"
              className="touch-none cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label={t('dragWidget')}
              {...attributes}
              {...listeners}
            />
          )}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <CardTitle className="truncate text-sm font-medium">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {widget.type === 'history_table' ? (
            <HistoryTableWidget widget={widget} />
          ) : widget.type === 'stat' ? (
            <StatWidget widget={widget} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{t(`widgetTypes.${widget.type}`)}</p>
              <p className="mt-2 text-sm text-muted-foreground/80">{t('placeholder')}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
