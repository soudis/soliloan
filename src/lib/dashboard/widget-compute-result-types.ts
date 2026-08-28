import type { DashboardLender, DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { ChartDataModel } from '@/lib/dashboard/chart/chart-data-model';
import type { HistoryTableResult } from '@/lib/dashboard/history-table/compute-history-table';
import type { PieChartResult } from '@/lib/dashboard/pie-chart/compute-pie-chart';
import type { DashboardLayoutScopeKey } from '@/types/dashboard-layout';
import type { StatItemConfig } from '@/types/dashboard-widgets/stat-widget';
import type { TransactionListItem } from '@/types/transactions';

export type StatWidgetComputeResult = {
  type: 'stat';
  values: { stat: StatItemConfig; value: number | null }[];
};

export type HistoryTableWidgetComputeResult = {
  type: 'history_table';
  result: HistoryTableResult;
};

export type PieChartWidgetComputeResult = {
  type: 'pie_chart';
  result: PieChartResult;
};

export type LineChartWidgetComputeResult = {
  type: 'line_chart';
  result: ChartDataModel | null;
};

export type BarChartWidgetComputeResult = {
  type: 'bar_chart';
  result: ChartDataModel | null;
};

export type LoanTableWidgetComputeResult = {
  type: 'loan_table_view';
  rows: DashboardLoan[];
};

export type LenderTableWidgetComputeResult = {
  type: 'lender_table_view';
  rows: DashboardLender[];
};

export type TransactionTableWidgetComputeResult = {
  type: 'transaction_table_view';
  rows: TransactionListItem[];
};

export type DividerWidgetComputeResult = {
  type: 'divider';
};

export type WidgetComputeResult =
  | StatWidgetComputeResult
  | HistoryTableWidgetComputeResult
  | PieChartWidgetComputeResult
  | LineChartWidgetComputeResult
  | BarChartWidgetComputeResult
  | LoanTableWidgetComputeResult
  | LenderTableWidgetComputeResult
  | TransactionTableWidgetComputeResult
  | DividerWidgetComputeResult;

export type DashboardWidgetResultsByScope = Record<DashboardLayoutScopeKey, Record<string, WidgetComputeResult>>;
