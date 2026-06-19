'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useRouter } from '@/i18n/navigation';
import {
  buildAllTransactionTableColumns,
  getTransactionSortValue,
} from '@/lib/dashboard/table-widget/transaction-table-column-registry';
import {
  filterWidgetTransactions,
  flattenDashboardLoansToTransactions,
  transactionMatchesFilters,
} from '@/lib/entity-filters/apply-transaction-filters';
import { buildTransactionFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import type { DashboardWidget } from '@/types/dashboard-layout';
import type { TransactionListItem } from '@/types/transactions';
import { parseTransactionTableConfig } from '@/types/dashboard-widgets/table-view';

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
  const { loans, project, getOrComputeWidgetResult } = useDashboardData();

  const config = useMemo(() => parseTransactionTableConfig(widget.config), [widget.config]);

  const fieldOptions = useMemo(
    () => buildTransactionFilterFieldOptions(project, tTransactions, tLoans, tLenders, commonT),
    [project, tTransactions, tLoans, tLenders, commonT],
  );

  const columns = useMemo(
    () =>
      buildAllTransactionTableColumns(project, tTransactions, tLoans, tLenders, commonT, locale, (key, values) =>
        tDuration(key, values),
      ),
    [project, tTransactions, tLoans, tLenders, commonT, locale, tDuration],
  );

  const filteredRows = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () =>
          getOrComputeWidgetResult(
            buildWidgetComputeCacheKey(widget.type, widget.config, loans.length, Date.now()),
            () => {
              const flattened = flattenDashboardLoansToTransactions(loans);
              const withoutInterest = filterWidgetTransactions(flattened, false);
              return withoutInterest.filter((row) =>
                transactionMatchesFilters(row, config.filters, commonT, fieldOptions),
              );
            },
          ),
      }),
    [widget.type, widget.id, widget.config, loans, config.filters, commonT, fieldOptions, getOrComputeWidgetResult],
  );

  const getSortValue = useCallback(
    (row: TransactionListItem, columnId: string) => getTransactionSortValue(row, columnId, commonT),
    [commonT],
  );

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
