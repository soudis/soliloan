'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEffectiveWidgetColSpanClassName, widgetShowsCardHeader } from '@/lib/dashboard/layout-utils';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';

import { BarChartWidget } from '../widgets/bar-chart-widget';
import { DividerWidget } from '../widgets/divider-widget';
import { HistoryTableWidget } from '../widgets/history-table-widget';
import { LenderTableWidget } from '../widgets/lender-table-widget';
import { LineChartWidget } from '../widgets/line-chart-widget';
import { LoanTableWidget } from '../widgets/loan-table-widget';
import { PieChartWidget } from '../widgets/pie-chart-widget';
import { StatWidget } from '../widgets/stat-widget';
import { useDashboardEditor } from './dashboard-layout-context';
import { WIDGET_TYPE_ICONS } from './widget-icons';

function DashboardWidgetSlotComponent({ widget, rowId }: { widget: DashboardWidget; rowId: string }) {
  const t = useTranslations('dashboard.customizer');
  const { isCustomizing, selectedWidgetId, setSelectedWidgetId } = useDashboardEditor();
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

  const Icon = WIDGET_TYPE_ICONS[widget.type];
  const showHeader = widgetShowsCardHeader(widget);
  const isDivider = widget.type === 'divider';

  // Keyed only on the widget so selection/customize-mode re-renders of this slot
  // don't force the (expensive) widget body to re-render.
  const widgetBody = useMemo(() => {
    switch (widget.type) {
      case 'divider':
        return <DividerWidget title={widget.title} />;
      case 'history_table':
        return <HistoryTableWidget widget={widget} />;
      case 'stat':
        return <StatWidget widget={widget} />;
      case 'pie_chart':
        return <PieChartWidget widget={widget} />;
      case 'bar_chart':
        return <BarChartWidget widget={widget} />;
      case 'line_chart':
        return <LineChartWidget widget={widget} />;
      case 'loan_table_view':
        return <LoanTableWidget widget={widget} />;
      case 'lender_table_view':
        return <LenderTableWidget widget={widget} />;
      default:
        return <p className="text-sm text-muted-foreground/80">{t('placeholder')}</p>;
    }
  }, [widget, t]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(getEffectiveWidgetColSpanClassName(widget), 'min-w-0 p-0.5', isDragging && 'z-10 opacity-50')}
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
        {...(isCustomizing
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-pressed': isSelected,
              'aria-label': widget.title.trim() || t(`widgetTypes.${widget.type}`),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedWidgetId(widget.id);
                }
              },
            }
          : {})}
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
            className={cn('flex flex-row items-center gap-2 space-y-0 px-6 pb-2', isCustomizing ? 'pt-4' : 'pt-0')}
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
          {widgetBody}
        </CardContent>
      </Card>
    </div>
  );
}

export const DashboardWidgetSlot = memo(DashboardWidgetSlotComponent);
