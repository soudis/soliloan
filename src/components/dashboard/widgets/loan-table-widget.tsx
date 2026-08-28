'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useComputedWidgetResult } from '@/hooks/use-computed-widget-result';
import { useRouter } from '@/i18n/navigation';
import { buildAllLoanTableColumns, getLoanSortValue } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseLoanTableConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewWidget } from './table-view-widget';

export function LoanTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.loanTable');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const locale = useLocale();
  const router = useRouter();
  const { project } = useDashboardData();

  const config = useMemo(() => parseLoanTableConfig(widget.config), [widget.config]);
  const computed = useComputedWidgetResult(widget);
  const filteredLoans = computed.type === 'loan_table_view' ? computed.rows : [];

  const columns = useMemo(
    () => buildAllLoanTableColumns(project, tLoans, tLenders, commonT, locale, (key, values) => tDuration(key, values)),
    [project, tLoans, tLenders, commonT, locale, tDuration],
  );

  const getSortValue = useCallback(
    (row: DashboardLoan, columnId: string) => getLoanSortValue(row, columnId, commonT),
    [commonT],
  );

  return (
    <TableViewWidget
      config={config}
      rows={filteredLoans}
      columns={columns as ColumnDef<DashboardLoan>[]}
      emptyMessage={t('emptyData')}
      getSortValue={getSortValue}
      onRowClick={(row) => router.push(`/lenders/${row.lender.id}?loanId=${row.id}`)}
    />
  );
}
