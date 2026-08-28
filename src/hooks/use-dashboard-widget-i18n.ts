'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { createDashboardWidgetI18n, type DashboardWidgetI18n } from '@/lib/dashboard/widget-i18n';

export function useDashboardWidgetI18n(): DashboardWidgetI18n {
  const locale = useLocale();
  const formatter = useFormatter();
  const commonT = useTranslations('common');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const tTransactions = useTranslations('dashboard.transactions');
  const tPie = useTranslations('dashboard.widgets.pieChart');
  const tLine = useTranslations('dashboard.widgets.lineChart');
  const tBar = useTranslations('dashboard.widgets.barChart');
  const tHistoryTableWidget = useTranslations('dashboard.widgets.historyTable');
  const tHistoryMetrics = useTranslations('dashboard.customizer.historyTable');

  return useMemo(
    () =>
      createDashboardWidgetI18n({
        locale,
        formatMonth: (year, month) =>
          formatter.dateTime(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' }),
        commonT: (key, values) => commonT(key, values),
        tLoans: (key, values) => tLoans(key, values),
        tLenders: (key, values) => tLenders(key, values),
        tTransactions: (key, values) => tTransactions(key, values),
        tPie: (key, values) => tPie(key, values),
        tLine: (key, values) => tLine(key, values),
        tBar: (key, values) => tBar(key, values),
        tHistoryTableWidget: (key, values) => tHistoryTableWidget(key, values),
        tHistoryMetrics: (key, values) => tHistoryMetrics(key, values),
      }),
    [
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
    ],
  );
}
