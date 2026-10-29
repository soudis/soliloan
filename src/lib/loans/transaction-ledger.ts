import { type Loan, type Transaction, TransactionType } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear, type LoanForPerYear } from '@/lib/calculations/loan-calculations';
import { sortTransactions } from '@/lib/utils/sorters';

/** The parts of a Kredit the ledger replay needs; the Zahlungen are passed separately. */
export type LedgerLoan = Pick<Loan, 'amount'> & Omit<LoanForPerYear, 'transactions'>;

export const CLOSING_TYPES: TransactionType[] = [TransactionType.TERMINATION, TransactionType.NOTRECLAIMED];
export const PARTIAL_TYPES: TransactionType[] = [TransactionType.WITHDRAWAL, TransactionType.NOTRECLAIMEDPARTIAL];
/** Types that reduce the Kontostand (stored with a negative amount). */
export const OUTFLOW_TYPES: TransactionType[] = [...CLOSING_TYPES, ...PARTIAL_TYPES, TransactionType.INTERESTPAYMENT];

export const isClosingType = (type: TransactionType) => CLOSING_TYPES.includes(type);

/** Amount as stored: outflows are negative. */
export const toStoredAmount = (type: TransactionType, amount: number) =>
  OUTFLOW_TYPES.includes(type) ? -Math.abs(amount) : Math.abs(amount);

/**
 * The calculation treats a Kontostand of 1 € or less as closed (interest stops), so a partial
 * transaction has to leave more than this.
 */
export const MIN_REMAINING_BALANCE = 1;

export const toCents = (value: number) => Math.round(value * 100);

export type ViolationRule =
  /** Einlagenstand above the Kreditbetrag after an Einzahlung (`value` = Einlagenstand, `limit` = Kreditbetrag). */
  | 'CAP_EXCEEDED'
  /** Kontostand below 0 (`value` = Kontostand after the transaction). */
  | 'BALANCE_NEGATIVE'
  /** Partial transaction leaves 1 € or less (`value` = Kontostand after the transaction). */
  | 'PARTIAL_TOO_LARGE'
  /** Zinsauszahlung above the unpaid interest (`value` = amount, `limit` = unpaid interest). */
  | 'INTEREST_EXCEEDS_ACCRUED'
  /** Rückzahlung / Erlassung without a Kontostand to close (`value` = Kontostand). */
  | 'NOTHING_TO_CLOSE'
  /**
   * Any Zahlung after a Rückzahlung / Erlassung. A closed Kredit is final: the interest calculation
   * does not support a Kredit that is funded again, a new Kredit has to be created instead.
   */
  | 'AFTER_CLOSING';

export type Violation = {
  rule: ViolationRule;
  transactionId: string;
  type: TransactionType;
  date: Date;
  value: number;
  limit: number;
};

export type ClosingDifference = {
  transactionId: string;
  type: TransactionType;
  date: Date;
  /** Amount of the closing Zahlung (positive). */
  amount: number;
  /** Kontostand on its day, before the closing Zahlung. */
  balance: number;
  /** amount − balance: positive = paid out more than the Kontostand. */
  difference: number;
};

export type LedgerEntry = {
  transaction: Transaction;
  balanceBefore: number;
  balanceAfter: number;
  einlagenstandAfter: number;
};

const dayOf = (date: Date) => moment(date).startOf('day');

/** Real Zahlungen only (no synthetic interest rows), normalised to the start of their day and in canonical order. */
export const toLedger = (transactions: Transaction[]) =>
  sortTransactions(
    transactions
      .filter((transaction) => transaction.type !== TransactionType.INTEREST)
      .map((transaction) => ({ ...transaction, date: dayOf(transaction.date).toDate() })),
  );

/** Plain ledger Kontostand (with interest) at the end of `date`, without the closing correction. */
const rawBalance = (loan: LedgerLoan, transactions: Transaction[], date: Date) => {
  if (transactions.length === 0) {
    return 0;
  }
  const perYear = calculateLoanPerYear({ ...loan, transactions }, dayOf(date).toDate(), undefined, { raw: true });
  return perYear.at(-1)?.end.toNumber() ?? 0;
};

const einlagenstandDelta = (transaction: Transaction) =>
  transaction.type === TransactionType.DEPOSIT || PARTIAL_TYPES.includes(transaction.type) ? transaction.amount : 0;

/**
 * Kontostand and Einlagenstand at the end of `date`. A closing Zahlung resets both: what follows
 * starts from zero, as the Zinskorrektur makes the Kontostand end at zero.
 */
export const stateAt = (loan: LedgerLoan, transactions: Transaction[], date: Date) => {
  const day = dayOf(date);
  let segment: Transaction[] = [];
  let einlagenstand = 0;
  for (const transaction of toLedger(transactions)) {
    if (dayOf(transaction.date).isAfter(day, 'day')) {
      break;
    }
    if (isClosingType(transaction.type)) {
      segment = [];
      einlagenstand = 0;
      continue;
    }
    segment.push(transaction);
    einlagenstand += einlagenstandDelta(transaction);
  }
  return { balance: rawBalance(loan, segment, date), einlagenstand };
};

/**
 * Replays the Zahlungen in canonical order and checks them against the rules. A closing Zahlung is
 * final: every Zahlung after it is a violation (`AFTER_CLOSING`) and is not checked further.
 * With `fromDate`, Zahlungen before that day are only counted, not checked (they cannot be affected
 * by a change on or after it).
 */
export const replayLedger = (loan: LedgerLoan, transactions: Transaction[], options: { fromDate?: Date } = {}) => {
  const fromDay = options.fromDate ? dayOf(options.fromDate) : undefined;
  const entries: LedgerEntry[] = [];
  const violations: Violation[] = [];
  const closingDifferences: ClosingDifference[] = [];

  let segment: Transaction[] = [];
  let einlagenstand = 0;
  let closed = false;

  for (const transaction of toLedger(transactions)) {
    const afterClosing = closed;
    const checked = !fromDay || !dayOf(transaction.date).isBefore(fromDay, 'day');
    const closing = isClosingType(transaction.type);
    const balanceBefore = checked ? rawBalance(loan, segment, transaction.date) : 0;
    const balanceAfter = balanceBefore + transaction.amount;
    const einlagenstandBefore = einlagenstand;
    einlagenstand = closing ? 0 : einlagenstand + einlagenstandDelta(transaction);

    if (checked) {
      const violate = (rule: ViolationRule, value: number, limit: number) =>
        violations.push({
          rule,
          transactionId: transaction.id,
          type: transaction.type,
          date: transaction.date,
          value,
          limit,
        });

      if (afterClosing) {
        violate('AFTER_CLOSING', 0, 0);
      } else if (closing) {
        const amount = Math.abs(transaction.amount);
        if (toCents(balanceBefore) <= 1) {
          violate('NOTHING_TO_CLOSE', balanceBefore, 0);
        }
        closingDifferences.push({
          transactionId: transaction.id,
          type: transaction.type,
          date: transaction.date,
          amount,
          balance: balanceBefore,
          difference: (toCents(amount) - toCents(balanceBefore)) / 100,
        });
      } else if (toCents(balanceAfter) < 0) {
        violate('BALANCE_NEGATIVE', balanceAfter, 0);
      } else if (PARTIAL_TYPES.includes(transaction.type) && toCents(balanceAfter) <= toCents(MIN_REMAINING_BALANCE)) {
        violate('PARTIAL_TOO_LARGE', balanceAfter, MIN_REMAINING_BALANCE);
      } else if (transaction.type === TransactionType.INTERESTPAYMENT) {
        const unpaidInterest = balanceBefore - Math.max(einlagenstandBefore, 0);
        if (toCents(Math.abs(transaction.amount)) > toCents(unpaidInterest)) {
          violate('INTEREST_EXCEEDS_ACCRUED', Math.abs(transaction.amount), Math.max(unpaidInterest, 0));
        }
      } else if (transaction.type === TransactionType.DEPOSIT && toCents(einlagenstand) > toCents(loan.amount)) {
        violate('CAP_EXCEEDED', einlagenstand, loan.amount);
      }

      entries.push({ transaction, balanceBefore, balanceAfter, einlagenstandAfter: einlagenstand });
    }

    if (closing) {
      closed = true;
      segment = [];
    } else {
      segment.push(transaction);
    }
  }

  return { entries, violations, closingDifferences };
};

const violationKey = (violation: Violation) => `${violation.rule}|${dayOf(violation.date).format('YYYY-MM-DD')}`;

/** Violations in `after` that `before` did not already have (matched by rule and day). */
export const introducedViolations = (before: Violation[], after: Violation[]) => {
  const existing = new Set(before.map(violationKey));
  return after.filter((violation) => !existing.has(violationKey(violation)));
};

/** The highest Einlagenstand the Kredit ever reached; the Kreditbetrag cannot be lowered below it. */
export const peakEinlagenstand = (transactions: Transaction[]) => {
  let einlagenstand = 0;
  let peak = 0;
  for (const transaction of toLedger(transactions)) {
    einlagenstand = isClosingType(transaction.type) ? 0 : einlagenstand + einlagenstandDelta(transaction);
    peak = Math.max(peak, einlagenstand);
  }
  return peak;
};
