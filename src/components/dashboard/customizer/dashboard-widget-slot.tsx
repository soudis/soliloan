'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart3, GripVertical, Hash, LineChart, Minus, PieChart, Table2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveWidgetColSpanClassName, widgetShowsCardHeader } from '@/lib/dashboard/layout-utils';
import { cn } from '@/lib/utils';
import type { DashboardWidget, DashboardWidgetType } from '@/types/dashboard-layout';

import { DividerWidget } from '../widgets/divider-widget';
import { HistoryTableWidget } from '../widgets/history-table-widget';
import { PieChartWidget } from '../widgets/pie-chart-widget';
import { StatWidget } from '../widgets/stat-widget';
import { useDashboardLayout } from './dashboard-layout-context';

const WIDGET_ICONS: Record<DashboardWidgetType, React.ComponentType<{ className?: string }>> = {
  history_table: Table2,
  pie_chart: PieChart,
  line_chart: LineChart,
  bar_chart: BarChart3,
  stat: Hash,
  divider: Minus,
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
  const showHeader = widgetShowsCardHeader(widget);
  const isDivider = widget.type === 'divider';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getEffectiveWidgetColSpanClassName(widget),
        'min-w-0 p-0.5',
        isDragging && 'z-10 opacity-50',
      )}
    >
      <Card
        className={cn(
          'gap-0 overflow-hidden',
          isDivider
            ? 'min-h-0 border-0 bg-transparent pb-4 shadow-none'
            : cn(
                'h-full min-h-[120px] border-2 pb-6 shadow-sm',
                isSelected && isCustomizing ? 'border-primary' : 'border-border',
                isCustomizing && 'ring-1 ring-primary/15',
              ),
          isCustomizing ? 'pt-0' : showHeader ? 'pt-4' : isDivider ? 'pt-4' : 'pt-5',
          isDivider && isCustomizing && isSelected && 'border-2 border-primary ring-1 ring-primary/15',
        )}
        onClick={() => {
          if (isCustomizing) {
            setSelectedWidgetId(widget.id);
          }
        }}
      >
        {isCustomizing ? (
          <button
            type="button"
            className="flex w-full touch-none cursor-grab items-center justify-center border-b border-border/60 bg-muted/40 py-1.5 hover:bg-muted active:cursor-grabbing"
            aria-label={t('dragWidget')}
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </button>
        ) : null}

        {showHeader ? (
          <CardHeader
            className={cn(
              'flex flex-row items-center gap-2 space-y-0 px-6 pb-2',
              isCustomizing ? 'pt-4' : 'pt-0',
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CardTitle className="min-w-0 flex-1 truncate text-sm font-medium">{widget.title}</CardTitle>
          </CardHeader>
        ) : null}

        <CardContent
          className={cn(
            isDivider ? 'px-6 py-0' : undefined,
            !showHeader && !isDivider && (isCustomizing ? 'pt-5' : 'pt-0'),
          )}
        >
          {widget.type === 'divider' ? (
            <DividerWidget title={widget.title} />
          ) : widget.type === 'history_table' ? (
            <HistoryTableWidget widget={widget} />
          ) : widget.type === 'stat' ? (
            <StatWidget widget={widget} />
          ) : widget.type === 'pie_chart' ? (
            <PieChartWidget widget={widget} />
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
