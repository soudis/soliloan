/** Shared translators for widget compute (server and client). */

export type TranslateValues = Record<string, string | number>;

export type TranslateFn = (key: string, values?: TranslateValues) => string;

export type CommonT = (key: string, values?: Record<string, string>) => string;

export type DashboardWidgetI18n = {
  locale: string;
  formatMonth: (year: number, month: number) => string;
  commonT: CommonT;
  tLoans: TranslateFn;
  tLenders: TranslateFn;
  tTransactions: TranslateFn;
  tPie: TranslateFn;
  tLine: TranslateFn;
  tBar: TranslateFn;
  historyUntilNow: string;
  metricLabel: (metric: string) => string;
};

export function createDashboardWidgetI18n(deps: {
  locale: string;
  formatMonth: (year: number, month: number) => string;
  commonT: CommonT;
  tLoans: TranslateFn;
  tLenders: TranslateFn;
  tTransactions: TranslateFn;
  tPie: TranslateFn;
  tLine: TranslateFn;
  tBar: TranslateFn;
  tHistoryTableWidget: TranslateFn;
  tHistoryMetrics: TranslateFn;
}): DashboardWidgetI18n {
  return {
    locale: deps.locale,
    formatMonth: deps.formatMonth,
    commonT: deps.commonT,
    tLoans: deps.tLoans,
    tLenders: deps.tLenders,
    tTransactions: deps.tTransactions,
    tPie: deps.tPie,
    tLine: deps.tLine,
    tBar: deps.tBar,
    historyUntilNow: deps.tHistoryTableWidget('untilNow'),
    metricLabel: (metric) => deps.tHistoryMetrics(`metrics.${metric}`),
  };
}
