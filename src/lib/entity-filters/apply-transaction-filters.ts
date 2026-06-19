import { TransactionType } from '@prisma/client';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { getTransactionSortValue } from '@/lib/dashboard/table-widget/transaction-table-column-registry';
import { buildTransactionListItemsFromLoans } from '@/lib/transactions/build-transaction-list-items';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';
import type { TransactionListItem } from '@/types/transactions';

import { getFilterDefinitionForField } from './filter-definitions';
import { matchesFilterByType } from './filter-matchers';

export function transactionMatchesFilters(
  row: TransactionListItem,
  filters: EntityFilter[],
  commonT: (key: string, values?: Record<string, string>) => string,
  fieldOptions: EntityFilterFieldOption[],
  referenceDate: Date = new Date(),
): boolean {
  for (const filter of filters) {
    const definition = getFilterDefinitionForField(fieldOptions, filter.entity, filter.field);
    if (!definition) {
      continue;
    }

    let value: string | number | Date | null | undefined;
    if (filter.entity === 'transaction') {
      value = getTransactionSortValue(row, filter.field, commonT);
    } else if (filter.entity === 'loan') {
      value = getTransactionSortValue(
        row,
        filter.field.startsWith('loan.') ? filter.field : `loan.${filter.field}`,
        commonT,
      );
    } else {
      value = getTransactionSortValue(
        row,
        filter.field.startsWith('lender.') ? filter.field : `lender.${filter.field}`,
        commonT,
      );
    }

    if (!matchesFilterByType(value, filter.value, definition.type, { referenceDate })) {
      return false;
    }
  }

  return true;
}

export function flattenDashboardLoansToTransactions(loans: DashboardLoan[]): TransactionListItem[] {
  return buildTransactionListItemsFromLoans(loans);
}

export function filterWidgetTransactions(rows: TransactionListItem[], includeInterest = false): TransactionListItem[] {
  if (includeInterest) {
    return rows;
  }
  return rows.filter((row) => row.type !== TransactionType.INTEREST);
}
