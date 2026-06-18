'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useRouter } from '@/i18n/navigation';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { buildLoanFilterFieldOptions, filtersNeedPeriodSnapshot } from '@/lib/entity-filters/filter-definitions';
import { buildPeriodSnapshot } from '@/lib/dashboard/history-table/rollup-period';
import { buildAllLoanTableColumns, getLoanSortValue } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseLoanTableConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewWidget } from './table-view-widget';

export function LoanTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.loanTable');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const tDuration = useTranslations('common.duration');
  const locale = useLocale();
  const router = useRouter();
  const { loans, toDate, project, getOrComputeWidgetResult } = useDashboardData();

  const config = useMemo(() => parseLoanTableConfig(widget.config), [widget.config]);

  const fieldOptions = useMemo(() => buildLoanFilterFieldOptions(project, tLoans, commonT), [project, tLoans, commonT]);

  const columns = useMemo(
    () => buildAllLoanTableColumns(project, tLoans, commonT, locale, (key, values) => tDuration(key, values)),
    [project, tLoans, commonT, locale, tDuration],
  );

  const filteredLoans = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () =>
          getOrComputeWidgetResult(
            buildWidgetComputeCacheKey(widget.type, widget.config, loans.length, toDate.getTime()),
            () => {
              const periodEnd = toDate;
              const periodStart = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
              const period = {
                key: `loan-table-${widget.id}`,
                label: '',
                year: periodEnd.getFullYear(),
                month: periodEnd.getMonth() + 1,
                periodStart,
                periodEnd,
                isPartial: true,
              };
              // Only the as-of-date snapshot is expensive; skip it entirely when no filter needs it.
              const needsSnapshot = filtersNeedPeriodSnapshot(config.filters);
              return loans.filter((loan) => {
                const snapshot = needsSnapshot ? buildPeriodSnapshot(loan, period, 'monthly') : null;
                return loanMatchesFilters(
                  loan,
                  config.filters,
                  {
                    periodEnd,
                    periodStart,
                    snapshot,
                    commonT,
                    referenceDate: periodEnd,
                  },
                  fieldOptions,
                );
              });
            },
          ),
      }),
    [
      widget.type,
      widget.id,
      widget.config,
      loans,
      toDate,
      config.filters,
      commonT,
      fieldOptions,
      getOrComputeWidgetResult,
    ],
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
