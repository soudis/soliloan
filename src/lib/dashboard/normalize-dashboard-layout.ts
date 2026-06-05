import {
  DEFAULT_WIDTH_BY_TYPE,
  isDashboardWidgetWidth,
  widgetIsFullWidthLocked,
} from '@/lib/dashboard/layout-utils';
import { createDefaultBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { createDefaultLineChartConfig } from '@/types/dashboard-widgets/line-chart';
import { createDefaultHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { createDefaultPieChartConfig } from '@/types/dashboard-widgets/pie-chart';
import { createDefaultStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import type { DashboardLayoutData, DashboardWidget, DashboardWidgetType } from '@/types/dashboard-layout';

function normalizeWidget(widget: DashboardWidget & { type?: string }): DashboardWidget {
  const type = ((widget.type as string) === 'yearly_table' ? 'history_table' : widget.type) as DashboardWidgetType;
  const width = widgetIsFullWidthLocked(type)
    ? 'full'
    : widget.width && isDashboardWidgetWidth(widget.width)
      ? widget.width
      : DEFAULT_WIDTH_BY_TYPE[type];
  if ((widget.type as string) === 'yearly_table') {
    return {
      ...widget,
      type: 'history_table',
      width,
      config:
        widget.config && Object.keys(widget.config).length > 0
          ? widget.config
          : createDefaultHistoryTableConfig(),
    };
  }
  if (widget.type === 'history_table' && (!widget.config || Object.keys(widget.config).length === 0)) {
    return {
      ...widget,
      width,
      config: createDefaultHistoryTableConfig(),
    };
  }
  if (widget.type === 'stat' && (!widget.config || Object.keys(widget.config).length === 0)) {
    return {
      ...widget,
      width,
      config: createDefaultStatWidgetConfig(),
    };
  }
  if (widget.type === 'pie_chart' && (!widget.config || Object.keys(widget.config).length === 0)) {
    return {
      ...widget,
      width,
      config: createDefaultPieChartConfig(),
    };
  }
  if (widget.type === 'bar_chart' && (!widget.config || Object.keys(widget.config).length === 0)) {
    return {
      ...widget,
      width,
      config: createDefaultBarChartConfig(),
    };
  }
  if (widget.type === 'line_chart' && (!widget.config || Object.keys(widget.config).length === 0)) {
    return {
      ...widget,
      width,
      config: createDefaultLineChartConfig(),
    };
  }
  return { ...widget, width };
}

export function normalizeDashboardLayout(layout: DashboardLayoutData): DashboardLayoutData {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      widgets: row.widgets.map(normalizeWidget),
    })),
  };
}
