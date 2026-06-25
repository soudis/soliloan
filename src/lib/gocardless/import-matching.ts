import { TransactionType } from '@prisma/client';
import { getLenderName } from '@/lib/utils';
import { normalizeIban } from '@/lib/utils/iban';
import { LoanStatus, type LoanWithCalculations } from '@/types/loans';

export type BankImportCounterparty = {
  counterpartyName: string | null;
  counterpartyIban: string | null;
};

export type LenderForMatching = {
  id: string;
  iban: string | null;
  type: 'PERSON' | 'ORGANISATION';
  firstName: string | null;
  lastName: string | null;
  organisationName: string | null;
  titlePrefix: string | null;
  titleSuffix: string | null;
};

export function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeNameForMatch(a);
  const nb = normalizeNameForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

/** Match lender by exact IBAN first, else unique fuzzy name match. */
export function matchLender(counterparty: BankImportCounterparty, lenders: LenderForMatching[]): string | null {
  if (counterparty.counterpartyIban) {
    const iban = normalizeIban(counterparty.counterpartyIban);
    const byIban = lenders.filter((l) => l.iban && normalizeIban(l.iban) === iban);
    if (byIban.length === 1) {
      return byIban[0].id;
    }
    if (byIban.length > 1) {
      return null;
    }
  }

  if (!counterparty.counterpartyName) {
    return null;
  }

  const byName = lenders.filter((l) => {
    const lenderName = getLenderName(l);
    return lenderName && namesMatch(counterparty.counterpartyName ?? '', lenderName);
  });

  if (byName.length === 1) {
    return byName[0].id;
  }

  return null;
}

/** Whether a deposit of `depositAmount` can be applied to this loan. */
export function isDepositEligible(loan: LoanWithCalculations, depositAmount: number): boolean {
  const absAmount = Math.abs(depositAmount);
  if (loan.status === LoanStatus.REPAID || loan.status === LoanStatus.TERMINATED) {
    return false;
  }
  if (loan.deposits >= loan.amount) {
    return false;
  }
  const remaining = loan.amount - loan.deposits;
  return absAmount > 0 && absAmount <= remaining + 0.001;
}

/** Auto-select loan only when exactly one deposit-eligible loan exists for the lender. */
export function matchLoanForDeposit(lenderLoans: LoanWithCalculations[], depositAmount: number): string | null {
  const eligible = lenderLoans.filter((loan) => isDepositEligible(loan, depositAmount));
  return eligible.length === 1 ? eligible[0].id : null;
}

/** Server-side eligibility check mirroring transaction-form-fields rules. */
export function isLoanEligibleForTransaction(
  loan: LoanWithCalculations,
  type: TransactionType,
  amountMagnitude: number,
): boolean {
  const absAmount = Math.abs(amountMagnitude);
  if (absAmount <= 0) {
    return false;
  }

  switch (type) {
    case TransactionType.DEPOSIT:
      return isDepositEligible(loan, absAmount);
    case TransactionType.WITHDRAWAL:
      return loan.balance > 0 && absAmount <= loan.balance - 0.01 + 0.001;
    case TransactionType.INTERESTPAYMENT: {
      const maxInterest = loan.interest + loan.interestPaid;
      return loan.balance > 0 && maxInterest > 0 && absAmount <= Math.min(maxInterest, loan.balance - 0.01) + 0.001;
    }
    case TransactionType.TERMINATION:
      return loan.balance > 0;
    default:
      return false;
  }
}

export function defaultTransactionTypeForAmount(amount: number): TransactionType | null {
  return amount > 0 ? TransactionType.DEPOSIT : null;
}

export function isImportRowReadyForSelection(row: {
  amount: number;
  selectedLenderId: string | null;
  selectedLoanId: string | null;
  selectedType: TransactionType | null;
}): boolean {
  if (!row.selectedLenderId || !row.selectedLoanId) {
    return false;
  }
  if (row.amount < 0) {
    return row.selectedType != null;
  }
  return true;
}
