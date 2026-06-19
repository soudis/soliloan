import {
  createDefaultWidgetConfig,
  DEFAULT_WIDTH_BY_TYPE,
  isDashboardWidgetWidth,
  widgetIsFullWidthLocked,
} from '@/lib/dashboard/layout-utils';
import type { DashboardLayoutData, DashboardWidget, DashboardWidgetType } from '@/types/dashboard-layout';

const TYPES_WITH_DEFAULT_CONFIG: DashboardWidgetType[] = [
  'history_table',
  'stat',
  'pie_chart',
  'bar_chart',
  'line_chart',
  'loan_table_view',
  'lender_table_view',
  'transaction_table_view',
];

function normalizeWidget(widget: DashboardWidget & { type?: string }): DashboardWidget {
  // Legacy alias: the old `yearly_table` type maps onto `history_table`.
  const isLegacyYearlyTable = (widget.type as string) === 'yearly_table';
  const type = (isLegacyYearlyTable ? 'history_table' : widget.type) as DashboardWidgetType;
  const width = widgetIsFullWidthLocked(type)
    ? 'full'
    : widget.width && isDashboardWidgetWidth(widget.width)
      ? widget.width
      : DEFAULT_WIDTH_BY_TYPE[type];

  const configIsEmpty = !widget.config || Object.keys(widget.config).length === 0;
  const shouldSeedConfig = configIsEmpty && (isLegacyYearlyTable || TYPES_WITH_DEFAULT_CONFIG.includes(type));

  return {
    ...widget,
    type,
    width,
    config: shouldSeedConfig ? createDefaultWidgetConfig(type) : widget.config,
  };
}

export function normalizeDashboardLayout(layout: DashboardLayoutData): DashboardLayoutData {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      widgets: row.widgets.map(normalizeWidget),
    })),
  };
}
