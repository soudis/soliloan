import { BarChart3, Hash, LineChart, Minus, PieChart, Table2, Users } from 'lucide-react';
import type { ComponentType } from 'react';

import type { DashboardWidgetType } from '@/types/dashboard-layout';

/** Single source of truth for the icon shown per widget type (slot header + toolbox). */
export const WIDGET_TYPE_ICONS: Record<DashboardWidgetType, ComponentType<{ className?: string }>> = {
  history_table: Table2,
  pie_chart: PieChart,
  line_chart: LineChart,
  bar_chart: BarChart3,
  stat: Hash,
  divider: Minus,
  loan_table_view: Table2,
  lender_table_view: Users,
};
