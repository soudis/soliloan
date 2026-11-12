import { type Transaction, TransactionType } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import { isClosingType } from '@/lib/transactions/closing-types';
import {
  type ClosingDifference,
  introducedViolations,
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
  | { kind: 'CLOSING_DIFFERENCE'; difference: ClosingDifference }
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
  /** The rule that stops a lower amount (a later Zahlung that relies on this Einzahlung). Undefined at one cent. */
  minBinding?: Violation;
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

/** Translation key of the error for a rejected change. */
export const rejectionErrorKey = (errors: Violation[], fallback = 'error.transaction.invalid') => {
  if (errors.some((error) => error.rule === 'AFTER_CLOSING')) return 'error.transaction.afterClosing';
  if (errors.some((error) => error.rule === 'CLOSING_CHANGED')) return 'error.transaction.frozen';
  return fallback;
};

type Replay = ReturnType<typeof replayLedger>;

/**
 * What a change breaks: violations `before` did not have, plus every Rückzahlung / Erlassung whose
 * Abschlussdifferenz it alters. The Zahlung being edited (`exemptTransactionId`) may change its own.
 */
const changeErrors = (before: Replay, after: Replay, exemptTransactionId?: string): Violation[] => {
  const previousDifferences = new Map(before.closingDifferences.map((item) => [item.transactionId, item]));
  const changedClosings: Violation[] = [];
  for (const difference of after.closingDifferences) {
    const previous = previousDifferences.get(difference.transactionId);
    if (
      difference.transactionId !== exemptTransactionId &&
      previous &&
      toCents(previous.difference) !== toCents(difference.difference)
    ) {
      changedClosings.push({
        rule: 'CLOSING_CHANGED',
        transactionId: difference.transactionId,
        type: difference.type,
        date: difference.date,
        value: difference.difference,
        limit: previous.difference,
      });
    }
  }
  return [...introducedViolations(before.violations, after.violations), ...changedClosings];
};

/** What a change breaks, see `changeErrors`. `existing` is the stored ledger, `proposed` the ledger after the change. */
export const checkChange = (
  loan: LedgerLoan,
  existing: Transaction[],
  proposed: Transaction[],
  fromDate?: Date,
  options: { exemptTransactionId?: string } = {},
) => {
  const before = replayLedger(loan, existing, { fromDate });
  const after = replayLedger(loan, proposed, { fromDate });
  return {
    errors: changeErrors(before, after, options.exemptTransactionId),
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
    [...existing, buildTransaction(loanId, DRAFT_TRANSACTION_ID, draft.type, draft.date, draft.amount)],
    draft.date,
  );

/** Smallest amount in cents in [low, high] for which `holds` is true; `holds(high)` must be true and stay true above its threshold. */
const smallestCents = (low: number, high: number, holds: (cents: number) => boolean) => {
  let from = low;
  let to = high;
  while (from < to) {
    const middle = Math.floor((from + to) / 2);
    if (holds(middle)) {
      to = middle;
    } else {
      from = middle + 1;
    }
  }
  return from;
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
  const candidateId = draft.transactionId ?? DRAFT_TRANSACTION_ID;
  const candidate = (type: TransactionType, amount: number) =>
    buildTransaction(loanId, candidateId, type, draft.date, amount);

  const fromDate = edited && moment(edited.date).isBefore(draft.date, 'day') ? edited.date : draft.date;
  // the full ledger: candidates are only replayed from `fromDate`, but existing violations are reported for all of it
  const baseline = replayLedger(loan, existing);

  const state = stateAt(loan, others, draft.date);
  const summary = { balance: state.balance, einlagenstand: state.einlagenstand };

  const introduced = (list: Transaction[]) =>
    changeErrors(baseline, replayLedger(loan, list, { fromDate }), draft.transactionId);

  // Kontostand before a closing Zahlung on that day: independent of its own amount
  const closingProbe = replayLedger(loan, [...others, candidate(TransactionType.TERMINATION, 0)], {
    fromDate,
  }).entries.find((entry) => entry.transaction.id === candidateId);
  const closingAmount = closingProbe ? round2(closingProbe.balanceBefore) : undefined;

  // The searches below probe the same amounts repeatedly
  const probes = new Map<string, Violation[]>();
  const probe = (type: TransactionType, cents: number) => {
    const key = `${type}|${cents}`;
    let errors = probes.get(key);
    if (!errors) {
      errors = introduced([...others, candidate(type, cents / 100)]);
      probes.set(key, errors);
    }
    return errors;
  };
  const isValid = (type: TransactionType, cents: number) => probe(type, cents).length === 0;
  const reasonOf = (errors: Violation[]) => errors.find((error) => error.transactionId === candidateId) ?? errors[0];
  const notCap = (error: Violation) => error.rule !== 'CAP_EXCEEDED';

  /**
   * Smallest amount in cents a non-closing Zahlung of `type` can have on the day, or why none works.
   * Every rule gets stricter as the amount grows, so this is usually one cent. The exception is an
   * Einzahlung that later Zahlungen rely on (one being edited or moved): only the Kreditbetrag gets
   * stricter as it grows, the rules on the later Zahlungen need a minimum.
   */
  const lowest = (
    type: TransactionType,
  ): { cents: number; binding?: Violation } | { reason: Violation | undefined } => {
    if (isValid(type, 1)) {
      return { cents: 1 };
    }
    const coversLater = (cents: number) => !probe(type, cents).some(notCap);
    if (type !== TransactionType.DEPOSIT || coversLater(1)) {
      return { reason: reasonOf(probe(type, 1)) };
    }
    const hi = toCents(loan.amount);
    if (!coversLater(hi)) {
      // not even the Kreditbetrag covers the later Zahlungen: name them, not the cap
      return { reason: reasonOf(probe(type, hi).filter(notCap)) };
    }
    const cents = smallestCents(1, hi, coversLater);
    return isValid(type, cents)
      ? { cents, binding: probe(type, cents - 1).find(notCap) }
      : { reason: reasonOf(probe(type, cents)) };
  };

  const closingCents = toCents(Math.max(closingAmount ?? 0, 0.01));
  const types: Record<string, TypeAvailability> = {};
  for (const type of BOOKABLE_TYPES) {
    const low = isClosingType(type) ? { reason: reasonOf(probe(type, closingCents)) } : lowest(type);
    types[type] = 'cents' in low || !low.reason ? { available: true } : { available: false, reason: low.reason };
  }

  const selected = draft.type;
  let limits: AmountLimits | undefined;
  if (selected && types[selected]?.available) {
    if (isClosingType(selected)) {
      limits = { min: closingCents / 100, max: closingCents / 100 };
    } else {
      const low = lowest(selected);
      const hi = selected === TransactionType.DEPOSIT ? toCents(loan.amount) : toCents(Math.max(state.balance, 0));
      if ('cents' in low && hi >= low.cents) {
        const maxCents = isValid(selected, hi)
          ? hi
          : smallestCents(low.cents, hi, (cents) => !isValid(selected, cents)) - 1;
        const binding =
          maxCents < hi || selected === TransactionType.DEPOSIT ? probe(selected, maxCents + 1)[0] : undefined;
        limits = { min: low.cents / 100, max: maxCents / 100, binding, minBinding: low.binding };
      }
    }
  }

  const errors: Violation[] = [];
  const warnings: TransactionWarning[] = [];

  if (selected && draft.amount !== undefined) {
    const proposed = [...others, candidate(selected, draft.amount)];
    const result = checkChange(loan, existing, proposed, fromDate, { exemptTransactionId: draft.transactionId });
    errors.push(...result.errors);

    // The edited Rückzahlung / Erlassung may differ from the Kontostand of its day: warn, offer "Neu berechnen"
    const own = result.after.closingDifferences.find((item) => item.transactionId === candidateId);
    if (own && Math.abs(own.difference) > 0.01) {
      warnings.push({ kind: 'CLOSING_DIFFERENCE', difference: own });
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
