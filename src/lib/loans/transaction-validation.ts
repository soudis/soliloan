import { type Transaction, TransactionType } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import {
  type ClosingDifference,
  introducedViolations,
  isClosingType,
  type LedgerLoan,
  replayLedger,
  stateAt,
  toCents,
  toLedger,
  toStoredAmount,
  type Violation,
} from './transaction-ledger';

/** Types a user can book. `INTEREST` rows are synthetic and never stored. */
export const BOOKABLE_TYPES: TransactionType[] = [
  TransactionType.DEPOSIT,
  TransactionType.WITHDRAWAL,
  TransactionType.TERMINATION,
  TransactionType.INTERESTPAYMENT,
  TransactionType.NOTRECLAIMEDPARTIAL,
  TransactionType.NOTRECLAIMED,
];

/** Id of the Zahlung being checked when it is not stored yet; it sorts after every stored id, i.e. as the newest. */
export const DRAFT_TRANSACTION_ID = '~draft';
const DRAFT_ID = DRAFT_TRANSACTION_ID;

/** A Zahlung as entered in the modal. `transactionId` is set when an existing Zahlung is edited. */
export type TransactionDraft = {
  transactionId?: string;
  date: Date;
  type?: TransactionType;
  /** Positive amount as typed in the form. */
  amount?: number;
};

export type YearChange = {
  year: number;
  interestBefore: number;
  interestAfter: number;
  balanceBefore: number;
  balanceAfter: number;
};

export type TransactionWarning =
  | { kind: 'FUTURE_DATE' }
  | { kind: 'CLOSING_DIFFERENCE'; difference: ClosingDifference; own: boolean }
  | { kind: 'PAST_YEARS'; years: YearChange[] }
  | { kind: 'NOTIFIED'; notifiedAt: Date }
  | { kind: 'EXISTING_VIOLATIONS'; count: number };

export type TypeAvailability = {
  available: boolean;
  /** Why the type is not possible on that day. */
  reason?: Violation;
};

export type AmountLimits = {
  min: number;
  max: number;
  /** The rule that stops a higher amount. Undefined when the max is only the natural limit. */
  binding?: Violation;
};

export type TransactionPreview = {
  /** State at the end of the chosen day, without the Zahlung being edited. */
  summary: { balance: number; einlagenstand: number };
  types: Record<string, TypeAvailability>;
  /** Limits for the selected type. */
  limits?: AmountLimits;
  /** For Rückzahlung / Erlassung: the Kontostand before it, i.e. what "Neu berechnen" sets. */
  closingAmount?: number;
  /** Violations the draft would introduce (block saving). */
  errors: Violation[];
  warnings: TransactionWarning[];
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** A Zahlung as it would be stored; `amount` is the positive amount as entered. */
export const buildTransaction = (
  loanId: string,
  id: string,
  type: TransactionType,
  date: Date,
  amount: number,
): Transaction => ({
  id,
  loanId,
  type,
  date,
  amount: toStoredAmount(type, amount),
  paymentType: 'BANK',
  lenderNotifiedAt: null,
});

const realTransactions = (transactions: Transaction[]) =>
  transactions.filter((transaction) => transaction.type !== TransactionType.INTEREST);

/** Interest and year-end Kontostand per calendar year as the Kredit shows them. */
const yearFigures = (loan: LedgerLoan, transactions: Transaction[], now: Date) => {
  const figures = new Map<number, { interest: number; balance: number }>();
  const ledger = toLedger(transactions);
  if (ledger.length === 0) {
    return figures;
  }
  for (const year of calculateLoanPerYear({ ...loan, transactions: ledger }, now)) {
    figures.set(year.year, { interest: year.interest.toNumber(), balance: year.end.toNumber() });
  }
  return figures;
};

/** Earlier calendar years whose interest or year-end Kontostand differ between two ledgers. */
export const changedPastYears = (
  loan: LedgerLoan,
  before: Transaction[],
  after: Transaction[],
  now: Date = new Date(),
): YearChange[] => {
  const beforeFigures = yearFigures(loan, before, now);
  const afterFigures = yearFigures(loan, after, now);
  const currentYear = moment(now).year();
  const years = [...new Set([...beforeFigures.keys(), ...afterFigures.keys()])].filter((year) => year < currentYear);
  return years
    .sort((a, b) => a - b)
    .flatMap((year) => {
      const b = beforeFigures.get(year) ?? { interest: 0, balance: 0 };
      const a = afterFigures.get(year) ?? { interest: 0, balance: 0 };
      const changed = toCents(b.interest) !== toCents(a.interest) || toCents(b.balance) !== toCents(a.balance);
      return changed
        ? [
            {
              year,
              interestBefore: b.interest,
              interestAfter: a.interest,
              balanceBefore: b.balance,
              balanceAfter: a.balance,
            },
          ]
        : [];
    });
};

/** Violations a change introduces: `proposed` is checked, anything `existing` already violated is ignored. */
export const checkChange = (loan: LedgerLoan, existing: Transaction[], proposed: Transaction[], fromDate?: Date) => {
  const before = replayLedger(loan, existing, { fromDate });
  const after = replayLedger(loan, proposed, { fromDate });
  return {
    errors: introducedViolations(before.violations, after.violations),
    existingViolations: before.violations,
    before,
    after,
  };
};

/** Violations introduced by adding one new Zahlung to the stored ledger. */
export const checkNewTransaction = (
  loan: LedgerLoan,
  loanId: string,
  existing: Transaction[],
  draft: { type: TransactionType; date: Date; amount: number },
) =>
  checkChange(
    loan,
    existing,
    [...existing, buildTransaction(loanId, DRAFT_ID, draft.type, draft.date, draft.amount)],
    draft.date,
  );

/** Largest amount in cents in [1, hi] for which `isValid` holds, or 0 if even one cent is invalid. */
const largestValidCents = (hi: number, isValid: (cents: number) => boolean) => {
  if (hi < 1 || !isValid(1)) {
    return 0;
  }
  if (isValid(hi)) {
    return hi;
  }
  let low = 1;
  let high = hi;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (isValid(middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
};

/**
 * Everything the modal needs for a Zahlung on `draft.date`: possible types with reasons, amount limits,
 * errors and warnings. Create and edit are the same: an edit removes the old version from the ledger
 * and adds the draft. The ledger of the Kredit as it is stored is `transactions`.
 */
export const previewTransaction = ({
  loan,
  loanId,
  transactions,
  draft,
  now = new Date(),
}: {
  loan: LedgerLoan;
  loanId: string;
  transactions: Transaction[];
  draft: TransactionDraft;
  now?: Date;
}): TransactionPreview => {
  const existing = realTransactions(transactions);
  const edited = draft.transactionId
    ? existing.find((transaction) => transaction.id === draft.transactionId)
    : undefined;
  const others = existing.filter((transaction) => transaction.id !== draft.transactionId);
  const candidateId = draft.transactionId ?? DRAFT_ID;
  const candidate = (type: TransactionType, amount: number) =>
    buildTransaction(loanId, candidateId, type, draft.date, amount);

  const fromDate = edited && moment(edited.date).isBefore(draft.date, 'day') ? edited.date : draft.date;
  // the full ledger: candidates are only replayed from `fromDate`, but existing violations are reported for all of it
  const baseline = replayLedger(loan, existing);

  const state = stateAt(loan, others, draft.date);
  const summary = { balance: state.balance, einlagenstand: state.einlagenstand };

  const introduced = (list: Transaction[]) =>
    introducedViolations(baseline.violations, replayLedger(loan, list, { fromDate }).violations);

  // Kontostand before a closing Zahlung on that day: independent of its own amount
  const closingProbe = replayLedger(loan, [...others, candidate(TransactionType.TERMINATION, 0)], {
    fromDate,
  }).entries.find((entry) => entry.transaction.id === candidateId);
  const closingAmount = closingProbe ? round2(closingProbe.balanceBefore) : undefined;

  const amountForAvailability = (type: TransactionType) =>
    isClosingType(type) ? Math.max(closingAmount ?? 0, 0.01) : 0.01;

  const types: Record<string, TypeAvailability> = {};
  for (const type of BOOKABLE_TYPES) {
    const errors = introduced([...others, candidate(type, amountForAvailability(type))]);
    const reason = errors.find((error) => error.transactionId === candidateId) ?? errors[0];
    types[type] = reason ? { available: false, reason } : { available: true };
  }

  const selected = draft.type;
  let limits: AmountLimits | undefined;
  if (selected && types[selected]?.available) {
    if (isClosingType(selected)) {
      const amount = Math.max(closingAmount ?? 0, 0.01);
      limits = { min: amount, max: amount };
    } else {
      const hi = selected === TransactionType.DEPOSIT ? toCents(loan.amount) : toCents(Math.max(state.balance, 0));
      const maxCents = largestValidCents(
        hi,
        (cents) => introduced([...others, candidate(selected, cents / 100)]).length === 0,
      );
      if (maxCents > 0) {
        const binding =
          maxCents < hi || selected === TransactionType.DEPOSIT
            ? introduced([...others, candidate(selected, (maxCents + 1) / 100)])[0]
            : undefined;
        limits = { min: 0.01, max: maxCents / 100, binding };
      }
    }
  }

  const errors: Violation[] = [];
  const warnings: TransactionWarning[] = [];

  if (selected && draft.amount !== undefined) {
    const proposed = [...others, candidate(selected, draft.amount)];
    const result = checkChange(loan, existing, proposed, fromDate);
    errors.push(...result.errors);

    // Closing Zahlungen that no longer match the Kontostand of their day
    const beforeDifferences = new Map(result.before.closingDifferences.map((item) => [item.transactionId, item]));
    for (const difference of result.after.closingDifferences) {
      const previous = beforeDifferences.get(difference.transactionId);
      const own = difference.transactionId === candidateId;
      // The edited closing Zahlung always shows its difference (it offers "Neu berechnen"); others only when it changed
      const changed = own || !previous || toCents(previous.difference) !== toCents(difference.difference);
      if (Math.abs(difference.difference) > 0.01 && changed) {
        warnings.push({ kind: 'CLOSING_DIFFERENCE', difference, own });
      }
    }

    const years = changedPastYears(loan, existing, proposed, now);
    if (years.length > 0) {
      warnings.push({ kind: 'PAST_YEARS', years });
    }

    if (
      edited?.lenderNotifiedAt &&
      (edited.type !== selected ||
        !moment(edited.date).isSame(draft.date, 'day') ||
        toCents(Math.abs(edited.amount)) !== toCents(draft.amount))
    ) {
      warnings.push({ kind: 'NOTIFIED', notifiedAt: edited.lenderNotifiedAt });
    }
  }

  if (moment(draft.date).isAfter(now, 'day')) {
    warnings.unshift({ kind: 'FUTURE_DATE' });
  }
  if (baseline.violations.length > 0) {
    warnings.push({ kind: 'EXISTING_VIOLATIONS', count: baseline.violations.length });
  }

  return { summary, types, limits, closingAmount, errors, warnings };
};
