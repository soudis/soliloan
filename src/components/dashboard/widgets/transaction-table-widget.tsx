'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { WidgetResultUnavailable } from '@/components/dashboard/widgets/widget-result-unavailable';
import { useComputedWidgetResult } from '@/hooks/use-computed-widget-result';
import { useRouter } from '@/i18n/navigation';
import {
  buildAllTransactionTableColumns,
  getTransactionSortValue,
} from '@/lib/dashboard/table-widget/transaction-table-column-registry';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseTransactionTableConfig } from '@/types/dashboard-widgets/table-view';
import type { TransactionListItem } from '@/types/transactions';

import { TableViewWidget } from './table-view-widget';

export function TransactionTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.transactionTable');
  const tTransactions = useTranslations('dashboard.transactions');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const locale = useLocale();
  const router = useRouter();
  const { project } = useDashboardData();

  const config = useMemo(() => parseTransactionTableConfig(widget.config), [widget.config]);
  const computed = useComputedWidgetResult(widget);
  const filteredRows = computed?.type === 'transaction_table_view' ? computed.rows : [];

  const columns = useMemo(
    () =>
      buildAllTransactionTableColumns(project, tTransactions, tLoans, tLenders, commonT, locale, (key, values) =>
        tDuration(key, values),
      ),
    [project, tTransactions, tLoans, tLenders, commonT, locale, tDuration],
  );

  const getSortValue = useCallback(
    (row: TransactionListItem, columnId: string) => getTransactionSortValue(row, columnId, commonT),
    [commonT],
  );

  if (!computed) {
    return <WidgetResultUnavailable />;
  }

  return (
    <TableViewWidget
      config={config}
      rows={filteredRows}
      columns={columns as ColumnDef<TransactionListItem>[]}
      emptyMessage={t('emptyData')}
      getSortValue={getSortValue}
      onRowClick={(row) => router.push(`/lenders/${row.loan.lender.id}?loanId=${row.loan.id}`)}
    />
  );
}
