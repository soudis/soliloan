import { DEFAULT_WIDTH_BY_TYPE } from '@/lib/dashboard/layout-utils';
import { createDefaultHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import type { DashboardLayoutData, DashboardWidget, DashboardWidgetType } from '@/types/dashboard-layout';

function normalizeWidget(widget: DashboardWidget & { type?: string }): DashboardWidget {
  const type = ((widget.type as string) === 'yearly_table' ? 'history_table' : widget.type) as DashboardWidgetType;
  const width = widget.width ?? DEFAULT_WIDTH_BY_TYPE[type];
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
