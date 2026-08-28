import { getFormatter, getLocale, getTranslations } from 'next-intl/server';

import { createDashboardWidgetI18n, type DashboardWidgetI18n } from '@/lib/dashboard/widget-i18n';

/** RSC-only: next-intl translators for `computeWidgetResult`. */
export async function loadDashboardWidgetI18n(): Promise<DashboardWidgetI18n> {
  const [
    locale,
    formatter,
    commonT,
    tLoans,
    tLenders,
    tTransactions,
    tPie,
    tLine,
    tBar,
    tHistoryTableWidget,
    tHistoryMetrics,
  ] = await Promise.all([
    getLocale(),
    getFormatter(),
    getTranslations('common'),
    getTranslations('dashboard.loans'),
    getTranslations('dashboard.lenders'),
    getTranslations('dashboard.transactions'),
    getTranslations('dashboard.widgets.pieChart'),
    getTranslations('dashboard.widgets.lineChart'),
    getTranslations('dashboard.widgets.barChart'),
    getTranslations('dashboard.widgets.historyTable'),
    getTranslations('dashboard.customizer.historyTable'),
  ]);

  return createDashboardWidgetI18n({
    locale,
    formatMonth: (year, month) => formatter.dateTime(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' }),
    commonT: (key, values) => commonT(key, values),
    tLoans: (key, values) => tLoans(key, values),
    tLenders: (key, values) => tLenders(key, values),
    tTransactions: (key, values) => tTransactions(key, values),
    tPie: (key, values) => tPie(key, values),
    tLine: (key, values) => tLine(key, values),
    tBar: (key, values) => tBar(key, values),
    tHistoryTableWidget: (key, values) => tHistoryTableWidget(key, values),
    tHistoryMetrics: (key, values) => tHistoryMetrics(key, values),
  });
}
