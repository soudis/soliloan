import type { ColumnGroupKey, ColumnGroupMeta } from '@/components/ui/data-table';

export const COLUMN_GROUP_ORDER: Record<ColumnGroupKey, number> = {
  transaction: 0,
  loanGeneral: 1,
  loanInterest: 2,
  loanSavings: 3,
  loanTerm: 4,
  lender: 5,
};

export const COLUMN_GROUP_KEYS_IN_ORDER: ColumnGroupKey[] = [
  'transaction',
  'loanGeneral',
  'loanInterest',
  'loanSavings',
  'loanTerm',
  'lender',
];

const LOAN_GENERAL_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'loanGeneral',
  order: COLUMN_GROUP_ORDER.loanGeneral,
};

const LOAN_INTEREST_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'loanInterest',
  order: COLUMN_GROUP_ORDER.loanInterest,
};

const LOAN_SAVINGS_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'loanSavings',
  order: COLUMN_GROUP_ORDER.loanSavings,
};

const LOAN_TERM_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'loanTerm',
  order: COLUMN_GROUP_ORDER.loanTerm,
};

const TRANSACTION_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'transaction',
  order: COLUMN_GROUP_ORDER.transaction,
};

const LENDER_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lender',
  order: COLUMN_GROUP_ORDER.lender,
};

/** Loan column ids in the interest subcategory (table + template field aliases). */
const LOAN_INTEREST_COLUMN_IDS = new Set([
  'interestRate',
  'interest',
  'interestPaid',
  'interestPaymentType',
  'altInterestMethod',
  'interestError',
]);

/** Loan column ids in the savings subcategory (table + template field aliases). */
const LOAN_SAVINGS_COLUMN_IDS = new Set([
  'isSavingsContract',
  'outstandingDepositSum',
  'outstandingDepositSinceDate',
  'outstandingDepositSinceDays',
  'depositsCount',
  'requiredDepositsCount',
  'outstandingDepositsCount',
  'savingsRateType',
  'savingsMonthlyAmount',
  'savingsDepositCount',
  'savingsFirstDepositDate',
  'savingsLastDepositDate',
  'savingsSummary',
  'savingsPaymentStatus',
]);

/** Loan column ids in the term subcategory (table + template field aliases). */
const LOAN_TERM_COLUMN_IDS = new Set([
  'terminationType',
  'totalRuntimeDays',
  'totalRuntime',
  'repayDate',
  'loanTermDays',
  'repaymentPeriodDays',
  'terminationDate',
  'endDate',
  'repaidDate',
  'isTerminated',
]);

export function loanColumnGroupFor(columnId: string): ColumnGroupMeta {
  const normalized = columnId.endsWith('Long') ? columnId.slice(0, -4) : columnId;
  if (LOAN_INTEREST_COLUMN_IDS.has(normalized) || LOAN_INTEREST_COLUMN_IDS.has(columnId)) {
    return LOAN_INTEREST_COLUMN_GROUP;
  }
  if (LOAN_SAVINGS_COLUMN_IDS.has(normalized) || LOAN_SAVINGS_COLUMN_IDS.has(columnId)) {
    return LOAN_SAVINGS_COLUMN_GROUP;
  }
  if (LOAN_TERM_COLUMN_IDS.has(normalized) || LOAN_TERM_COLUMN_IDS.has(columnId)) {
    return LOAN_TERM_COLUMN_GROUP;
  }
  return LOAN_GENERAL_COLUMN_GROUP;
}

export function transactionColumnGroup(): ColumnGroupMeta {
  return TRANSACTION_COLUMN_GROUP;
}

export function lenderColumnGroup(order = COLUMN_GROUP_ORDER.lender): ColumnGroupMeta {
  return { ...LENDER_COLUMN_GROUP, order };
}

/**
 * Resolve the column subcategory for a field/column id.
 * Pass `entity` when the id has no entity prefix (e.g. filter field `interestRate` with entity `loan`).
 * Prefixed ids (`loan.*`, `lender.*`, `transaction.*`) are resolved from the prefix alone.
 */
export function columnGroupForId(
  id: string,
  entity?: 'loan' | 'lender' | 'transaction' | string,
): ColumnGroupMeta | undefined {
  if (entity === 'lender' || id === 'lender' || id.startsWith('lender.')) {
    return lenderColumnGroup();
  }
  if (entity === 'transaction' || id === 'transaction' || id.startsWith('transaction.')) {
    return transactionColumnGroup();
  }

  if (entity === 'loan' || id.startsWith('loan.')) {
    const loanField = id.startsWith('loan.') ? id.slice('loan.'.length) : id;
    return loanColumnGroupFor(loanField);
  }

  return undefined;
}

/**
 * Column group for a loan-table column id.
 * Bare loan fields use loan subcategories; `lender.*` uses the lender group.
 */
export function loanTableColumnGroupFor(columnId: string): ColumnGroupMeta {
  if (columnId.startsWith('lender.')) {
    return lenderColumnGroup();
  }
  return loanColumnGroupFor(columnId);
}
