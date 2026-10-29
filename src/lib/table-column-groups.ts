import type { ColumnGroupKey, ColumnGroupMeta } from '@/components/ui/data-table';

export const COLUMN_GROUP_ORDER: Record<ColumnGroupKey, number> = {
  transaction: 0,
  loanGeneral: 1,
  loanInterest: 2,
  loanSavings: 3,
  loanTerm: 4,
  lenderGeneral: 5,
  lenderContact: 6,
  lenderAddress: 7,
  lenderBanking: 8,
  lenderAccount: 9,
  lenderAdditional: 10,
};

export const COLUMN_GROUP_KEYS_IN_ORDER: ColumnGroupKey[] = [
  'transaction',
  'loanGeneral',
  'loanInterest',
  'loanSavings',
  'loanTerm',
  'lenderGeneral',
  'lenderContact',
  'lenderAddress',
  'lenderBanking',
  'lenderAccount',
  'lenderAdditional',
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

const LENDER_GENERAL_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lenderGeneral',
  order: COLUMN_GROUP_ORDER.lenderGeneral,
};

const LENDER_CONTACT_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lenderContact',
  order: COLUMN_GROUP_ORDER.lenderContact,
};

const LENDER_ADDRESS_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lenderAddress',
  order: COLUMN_GROUP_ORDER.lenderAddress,
};

const LENDER_BANKING_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lenderBanking',
  order: COLUMN_GROUP_ORDER.lenderBanking,
};

const LENDER_ACCOUNT_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lenderAccount',
  order: COLUMN_GROUP_ORDER.lenderAccount,
};

const LENDER_ADDITIONAL_COLUMN_GROUP: ColumnGroupMeta = {
  key: 'lenderAdditional',
  order: COLUMN_GROUP_ORDER.lenderAdditional,
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

/** Lender column ids in the contact subcategory. */
const LENDER_CONTACT_COLUMN_IDS = new Set(['email', 'telNo', 'notificationType']);

/** Lender column ids in the address subcategory. */
const LENDER_ADDRESS_COLUMN_IDS = new Set([
  'address',
  'street',
  'addon',
  'zip',
  'place',
  'country',
  'fullAddress',
]);

/** Lender column ids in the banking subcategory. */
const LENDER_BANKING_COLUMN_IDS = new Set(['banking', 'iban', 'bic']);

/** Lender column ids in the account (Kreditkonto) subcategory. */
const LENDER_ACCOUNT_COLUMN_IDS = new Set([
  'amount',
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interest',
  'interestPaid',
  'interestError',
  'interestRate',
  'balanceInterestRate',
  'totalLoans',
  'activeLoans',
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

export function lenderColumnGroupFor(columnId: string): ColumnGroupMeta {
  const withoutPrefix = columnId.startsWith('lender.') ? columnId.slice('lender.'.length) : columnId;
  const normalized = withoutPrefix.endsWith('Long') ? withoutPrefix.slice(0, -4) : withoutPrefix;

  if (normalized.startsWith('additionalFields.')) {
    return LENDER_ADDITIONAL_COLUMN_GROUP;
  }
  if (LENDER_CONTACT_COLUMN_IDS.has(normalized) || LENDER_CONTACT_COLUMN_IDS.has(withoutPrefix)) {
    return LENDER_CONTACT_COLUMN_GROUP;
  }
  if (LENDER_ADDRESS_COLUMN_IDS.has(normalized) || LENDER_ADDRESS_COLUMN_IDS.has(withoutPrefix)) {
    return LENDER_ADDRESS_COLUMN_GROUP;
  }
  if (LENDER_BANKING_COLUMN_IDS.has(normalized) || LENDER_BANKING_COLUMN_IDS.has(withoutPrefix)) {
    return LENDER_BANKING_COLUMN_GROUP;
  }
  if (LENDER_ACCOUNT_COLUMN_IDS.has(normalized) || LENDER_ACCOUNT_COLUMN_IDS.has(withoutPrefix)) {
    return LENDER_ACCOUNT_COLUMN_GROUP;
  }
  return LENDER_GENERAL_COLUMN_GROUP;
}

export function transactionColumnGroup(): ColumnGroupMeta {
  return TRANSACTION_COLUMN_GROUP;
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
    const lenderField = id.startsWith('lender.') ? id.slice('lender.'.length) : id;
    return lenderColumnGroupFor(lenderField);
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
 * Bare loan fields use loan subcategories; `lender.*` uses lender subcategories.
 */
export function loanTableColumnGroupFor(columnId: string): ColumnGroupMeta {
  if (columnId.startsWith('lender.')) {
    return lenderColumnGroupFor(columnId);
  }
  return loanColumnGroupFor(columnId);
}
