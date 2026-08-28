import type { DashboardLender, DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { computeBarChart } from '@/lib/dashboard/bar-chart/compute-bar-chart';
import { computeHistoryTable } from '@/lib/dashboard/history-table/compute-history-table';
import { computeLineChart } from '@/lib/dashboard/line-chart/compute-line-chart';
import { computePieChart } from '@/lib/dashboard/pie-chart/compute-pie-chart';
import { computeAllStatValues } from '@/lib/dashboard/stat-widget/compute-stat-value';
import {
  filterLendersForTableWidget,
  filterLoansForTableWidget,
  filterTransactionsForTableWidget,
  slimLoanForTableWidget,
  slimTransactionRowForTableWidget,
} from '@/lib/dashboard/table-widget/compute-table-widget-rows';
import type { WidgetComputeResult } from '@/lib/dashboard/widget-compute-result-types';
import type { DashboardWidgetI18n } from '@/lib/dashboard/widget-i18n';
import {
  buildAllFilterFieldOptions,
  buildLenderFilterFieldOptions,
  buildLoanFilterFieldOptions,
  buildTransactionFilterFieldOptions,
} from '@/lib/entity-filters/filter-definitions';
import type { DashboardLayoutData, DashboardWidget } from '@/types/dashboard-layout';
import { parseBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { parseHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { parseLineChartConfig } from '@/types/dashboard-widgets/line-chart';
import { parsePieChartConfig } from '@/types/dashboard-widgets/pie-chart';
import { parseStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import {
  parseLenderTableConfig,
  parseLoanTableConfig,
  parseTransactionTableConfig,
} from '@/types/dashboard-widgets/table-view';
import type { ProjectWithConfiguration } from '@/types/projects';

export type DashboardWidgetComputeContext = {
  loans: DashboardLoan[];
  lenders: DashboardLender[];
  toDate: Date;
  project: ProjectWithConfiguration;
  i18n: DashboardWidgetI18n;
};

export function computeWidgetResult(widget: DashboardWidget, ctx: DashboardWidgetComputeContext): WidgetComputeResult {
  const { loans, lenders, toDate, project, i18n } = ctx;
  const fieldOptions = buildAllFilterFieldOptions(project, i18n.tLoans, i18n.tLenders, i18n.commonT);

  switch (widget.type) {
    case 'divider':
      return { type: 'divider' };
    case 'stat': {
      const config = parseStatWidgetConfig(widget.config);
      return {
        type: 'stat',
        values: computeAllStatValues(loans, config.stats, toDate, fieldOptions, i18n.commonT),
      };
    }
    case 'history_table': {
      const config = parseHistoryTableConfig(widget.config);
      return {
        type: 'history_table',
        result: computeHistoryTable(
          loans,
          config,
          toDate,
          fieldOptions,
          i18n.formatMonth,
          i18n.commonT,
          i18n.historyUntilNow,
        ),
      };
    }
    case 'pie_chart': {
      const config = parsePieChartConfig(widget.config);
      return {
        type: 'pie_chart',
        result: computePieChart(
          loans,
          config,
          toDate,
          fieldOptions,
          i18n.locale,
          i18n.tPie('emptyValue'),
          i18n.tPie('otherCategory'),
          i18n.commonT,
          i18n.tPie,
        ),
      };
    }
    case 'bar_chart': {
      const config = parseBarChartConfig(widget.config);
      return {
        type: 'bar_chart',
        result:
          config.series.length === 0
            ? null
            : computeBarChart(
                loans,
                config,
                toDate,
                fieldOptions,
                i18n.locale,
                i18n.formatMonth,
                i18n.tBar('emptyValue'),
                i18n.tBar('otherCategory'),
                i18n.historyUntilNow,
                i18n.commonT,
                i18n.tBar,
                i18n.metricLabel,
              ),
      };
    }
    case 'line_chart': {
      const config = parseLineChartConfig(widget.config);
      return {
        type: 'line_chart',
        result:
          config.series.length === 0
            ? null
            : computeLineChart(
                loans,
                config,
                toDate,
                fieldOptions,
                i18n.locale,
                i18n.formatMonth,
                i18n.tLine('emptyValue'),
                i18n.tLine('otherCategory'),
                i18n.historyUntilNow,
                i18n.commonT,
                i18n.tLine,
                i18n.metricLabel,
              ),
      };
    }
    case 'loan_table_view': {
      const config = parseLoanTableConfig(widget.config);
      const loanFieldOptions = buildLoanFilterFieldOptions(project, i18n.tLoans, i18n.commonT);
      const rows = filterLoansForTableWidget(
        loans,
        config.filters,
        toDate,
        loanFieldOptions,
        i18n.commonT,
        widget.id,
      ).map(slimLoanForTableWidget);
      return { type: 'loan_table_view', rows };
    }
    case 'lender_table_view': {
      const config = parseLenderTableConfig(widget.config);
      const lenderFieldOptions = buildLenderFilterFieldOptions(project, i18n.tLenders, i18n.tLoans, i18n.commonT);
      return {
        type: 'lender_table_view',
        rows: filterLendersForTableWidget(lenders, config.filters, lenderFieldOptions),
      };
    }
    case 'transaction_table_view': {
      const config = parseTransactionTableConfig(widget.config);
      const transactionFieldOptions = buildTransactionFilterFieldOptions(
        project,
        i18n.tTransactions,
        i18n.tLoans,
        i18n.tLenders,
        i18n.commonT,
      );
      return {
        type: 'transaction_table_view',
        rows: filterTransactionsForTableWidget(loans, config.filters, transactionFieldOptions, i18n.commonT).map(
          slimTransactionRowForTableWidget,
        ),
      };
    }
    default:
      return { type: 'divider' };
  }
}

export function computeLayoutWidgetResults(
  layout: DashboardLayoutData,
  ctx: DashboardWidgetComputeContext,
): Record<string, WidgetComputeResult> {
  const results: Record<string, WidgetComputeResult> = {};
  for (const row of layout.rows) {
    for (const widget of row.widgets) {
      results[widget.id] = computeWidgetResult(widget, ctx);
    }
  }
  return results;
}
