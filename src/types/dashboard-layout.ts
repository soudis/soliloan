export const DASHBOARD_WIDGET_TYPES = [
  'history_table',
  'pie_chart',
  'line_chart',
  'bar_chart',
  'stat',
  'loan_table_view',
  'lender_table_view',
] as const;

export type DashboardWidgetType = (typeof DASHBOARD_WIDGET_TYPES)[number];

export type DashboardWidgetWidth = 'quarter' | 'half' | 'full';

export type DashboardWidget = {
  id: string;
  type: DashboardWidgetType;
  title: string;
  width: DashboardWidgetWidth;
  config: Record<string, unknown>;
};

export type DashboardLayoutRow = {
  id: string;
  widgets: DashboardWidget[];
};

export type DashboardLayoutData = {
  rows: DashboardLayoutRow[];
};

export type DashboardLayoutScopeKey = 'project' | 'user';
