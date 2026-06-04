import { createDefaultHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import type { DashboardLayoutData, DashboardWidget } from '@/types/dashboard-layout';

function normalizeWidget(widget: DashboardWidget & { type?: string }): DashboardWidget {
  if ((widget.type as string) === 'yearly_table') {
    return {
      ...widget,
      type: 'history_table',
      config:
        widget.config && Object.keys(widget.config).length > 0
          ? widget.config
          : createDefaultHistoryTableConfig(),
    };
  }
  if (widget.type === 'history_table' && (!widget.config || Object.keys(widget.config).length === 0)) {
    return {
      ...widget,
      config: createDefaultHistoryTableConfig(),
    };
  }
  return widget;
}

export function normalizeDashboardLayout(layout: DashboardLayoutData): DashboardLayoutData {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      widgets: row.widgets.map(normalizeWidget),
    })),
  };
}
