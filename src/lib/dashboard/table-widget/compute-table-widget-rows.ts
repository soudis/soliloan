import type { DashboardLender, DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { buildPeriodSnapshot } from '@/lib/dashboard/history-table/rollup-period';
import type { CommonT } from '@/lib/dashboard/widget-i18n';
import { lenderMatchesFilters } from '@/lib/entity-filters/apply-lender-filters';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import {
  filterWidgetTransactions,
  flattenDashboardLoansToTransactions,
  transactionMatchesFilters,
} from '@/lib/entity-filters/apply-transaction-filters';
import { filtersNeedPeriodSnapshot } from '@/lib/entity-filters/filter-definitions';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';
import type { TransactionListItem } from '@/types/transactions';

export function filterLoansForTableWidget(
  loans: DashboardLoan[],
  filters: EntityFilter[],
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: CommonT,
  widgetId: string,
): DashboardLoan[] {
  const periodEnd = toDate;
  const periodStart = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  const period = {
    key: `loan-table-${widgetId}`,
    label: '',
    year: periodEnd.getFullYear(),
    month: periodEnd.getMonth() + 1,
    periodStart,
    periodEnd,
    isPartial: true,
  };
  const needsSnapshot = filtersNeedPeriodSnapshot(filters);
  return loans.filter((loan) => {
    const snapshot = needsSnapshot ? buildPeriodSnapshot(loan, period, 'monthly') : null;
    return loanMatchesFilters(
      loan,
      filters,
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
}

export function filterLendersForTableWidget(
  lenders: DashboardLender[],
  filters: EntityFilter[],
  fieldOptions: EntityFilterFieldOption[],
): DashboardLender[] {
  return lenders.filter((lender) => lenderMatchesFilters(lender, filters, fieldOptions));
}

export function filterTransactionsForTableWidget(
  loans: DashboardLoan[],
  filters: EntityFilter[],
  fieldOptions: EntityFilterFieldOption[],
  commonT: CommonT,
): TransactionListItem[] {
  const flattened = flattenDashboardLoansToTransactions(loans);
  const withoutInterest = filterWidgetTransactions(flattened, false);
  return withoutInterest.filter((row) => transactionMatchesFilters(row, filters, commonT, fieldOptions));
}

/** Drop monthly history from table rows so slim-mode payloads stay small. */
export function slimLoanForTableWidget(loan: DashboardLoan): DashboardLoan {
  return {
    ...loan,
    history: {},
    transactions: [],
    cumulativeTimeline: undefined,
  };
}

export function slimTransactionRowForTableWidget(row: TransactionListItem): TransactionListItem {
  return {
    ...row,
    loan: {
      ...row.loan,
      transactions: [],
      history: {},
      cumulativeTimeline: undefined,
    } as TransactionListItem['loan'],
  };
}
