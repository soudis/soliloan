import { type Loan, SavingsRateType, type Transaction, TransactionType } from '@prisma/client';
import moment from 'moment';

export type ExpectedTransaction = { date: Date; amount: number | null };

export type CoverageEntry = ExpectedTransaction & {
  cumulativeExpected: number | null;
  covered: boolean;
  outstandingAmount: number | null;
};

export type LoanCoverage = {
  timeline: CoverageEntry[];
  netReceived: number;
  depositsCount: number;
  amountsKnown: boolean;
};

export type OutstandingDepositMetrics = {
  depositsCount: number;
  requiredDepositsCount: number;
  outstandingDepositsCount: number;
  outstandingDepositSum: number | null;
  outstandingDepositSinceDate: Date | null;
  outstandingDepositSinceDays: number | null;
};

type LoanForSchedule = Pick<
  Loan,
  | 'amount'
  | 'signDate'
  | 'isSavingsContract'
  | 'savingsRateType'
  | 'savingsMonthlyAmount'
  | 'savingsDepositCount'
  | 'savingsFirstDepositDate'
  | 'savingsLastDepositDate'
>;

type LoanForOutstandingDeposits = LoanForSchedule & {
  transactions: Pick<Transaction, 'type' | 'date' | 'amount'>[];
};

type TransactionForCoverage = Pick<Transaction, 'type' | 'date' | 'amount'>;

const MONEY_EPSILON = 0.005;

const round2 = (value: number) => Math.round(value * 100) / 100;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sumUp = <T>(items: T[], getValue: (item: T) => number | null | undefined): number =>
  items.reduce((sum, item) => sum + (getValue(item) ?? 0), 0);

const isOnOrBefore = (date: Date, toDate: Date) =>
  moment(date).startOf('day').isSameOrBefore(moment(toDate).startOf('day'));

export const getDepositsUntilDate = (transactions: TransactionForCoverage[], toDate: Date): TransactionForCoverage[] =>
  transactions.filter(
    (transaction) => transaction.type === TransactionType.DEPOSIT && isOnOrBefore(transaction.date, toDate),
  );

export const getWithdrawalsUntilDate = (
  transactions: TransactionForCoverage[],
  toDate: Date,
): TransactionForCoverage[] =>
  transactions.filter(
    (transaction) => transaction.type === TransactionType.WITHDRAWAL && isOnOrBefore(transaction.date, toDate),
  );

export const getNetReceived = (deposits: TransactionForCoverage[], withdrawals: TransactionForCoverage[]): number => {
  const depositSum = sumUp(deposits, (transaction) => transaction.amount);
  const withdrawalSum = sumUp(withdrawals, (transaction) => transaction.amount);
  return depositSum - withdrawalSum;
};

export const getDueExpectedTransactions = (schedule: ExpectedTransaction[], toDate: Date): ExpectedTransaction[] =>
  schedule.filter((entry) => isOnOrBefore(entry.date, toDate)).sort((a, b) => a.date.getTime() - b.date.getTime());

export const areDueAmountsKnown = (due: ExpectedTransaction[]): boolean =>
  due.length > 0 && due.every((entry) => entry.amount != null);

export const buildAmountBasedCoverageTimeline = (due: ExpectedTransaction[], netReceived: number): CoverageEntry[] => {
  const available = Math.max(0, netReceived);
  let cumulative = 0;

  return due.map((entry) => {
    const amount = entry.amount as number;
    cumulative += amount;
    const covered = cumulative <= available + MONEY_EPSILON;
    const outstandingAmount = clamp(cumulative - available, 0, amount);

    return {
      date: entry.date,
      amount: entry.amount,
      cumulativeExpected: cumulative,
      covered,
      outstandingAmount,
    };
  });
};

export const buildCountBasedCoverageTimeline = (
  due: ExpectedTransaction[],
  depositsCount: number,
  withdrawalCount: number,
): CoverageEntry[] => {
  const coveredCount = Math.max(0, depositsCount - withdrawalCount);

  return due.map((entry, index) => ({
    date: entry.date,
    amount: entry.amount,
    cumulativeExpected: null,
    covered: index < coveredCount,
    outstandingAmount: null,
  }));
};

export const getDefaultFirstDepositDate = (signDate: unknown) => {
  const base = signDate instanceof Date ? signDate : signDate ? moment(signDate).toDate() : new Date();
  return moment(base).add(1, 'month').startOf('month').toDate();
};

export const calculateSavingsLastDepositDate = (firstDepositDate: Date, depositCount: number) => {
  const firstMoment = moment(firstDepositDate);
  if (!firstMoment.isValid()) return null;
  if (!Number.isFinite(depositCount) || depositCount < 1) return null;

  const lastMoment = firstMoment.clone().add(depositCount - 1, 'months');
  return lastMoment.isValid() ? lastMoment.toDate() : null;
};

export const calculateSavingsFirstDepositDate = (lastDepositDate: Date, depositCount: number) => {
  const lastMoment = moment(lastDepositDate);
  if (!lastMoment.isValid()) return null;
  if (!Number.isFinite(depositCount) || depositCount < 1) return null;

  const firstMoment = lastMoment.clone().subtract(depositCount - 1, 'months');
  return firstMoment.isValid() ? firstMoment.toDate() : null;
};

export const calculateSavingsDepositCountFromDates = (firstDepositDate: Date, lastDepositDate: Date) => {
  const firstMoment = moment(firstDepositDate);
  const lastMoment = moment(lastDepositDate);
  if (!firstMoment.isValid() || !lastMoment.isValid()) return null;
  if (lastMoment.isBefore(firstMoment, 'day')) return null;

  if (lastMoment.isSame(firstMoment, 'day')) return 1;

  const monthsBetween = Math.max(0, lastMoment.diff(firstMoment, 'months') - 1);
  return 2 + monthsBetween;
};

export const calculateSavingsMonthlyAmount = (loanAmount: number, depositCount: number) => {
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) return null;
  if (!Number.isFinite(depositCount) || depositCount < 1) return null;
  return round2(loanAmount / depositCount);
};

export const calculateSavingsDepositCountFromMonthlyAmount = (loanAmount: number, monthlyAmount: number) => {
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) return null;
  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) return null;
  return Math.ceil(loanAmount / monthlyAmount);
};

export const resolveSavingsLastDepositDate = (
  firstDepositDate: Date | null | undefined,
  lastDepositDate: Date | null | undefined,
  depositCount: number | null | undefined,
) => {
  if (lastDepositDate) {
    const lastMoment = moment(lastDepositDate);
    if (lastMoment.isValid()) return lastMoment.toDate();
  }

  if (firstDepositDate && depositCount != null && depositCount >= 1) {
    return calculateSavingsLastDepositDate(firstDepositDate, depositCount);
  }

  return null;
};

export const getExpectedDepositSchedule = (loan: LoanForSchedule): ExpectedTransaction[] => {
  if (
    loan.isSavingsContract &&
    loan.savingsFirstDepositDate &&
    loan.savingsDepositCount != null &&
    loan.savingsDepositCount >= 1
  ) {
    const firstMoment = moment(loan.savingsFirstDepositDate);
    if (!firstMoment.isValid()) {
      return [];
    }

    const amount =
      loan.savingsRateType === SavingsRateType.FIXED && loan.savingsMonthlyAmount != null
        ? loan.savingsMonthlyAmount
        : null;

    return Array.from({ length: loan.savingsDepositCount }, (_, index) => ({
      date: firstMoment.clone().add(index, 'months').toDate(),
      amount,
    }));
  }

  return [{ date: loan.signDate, amount: loan.amount }];
};

export const captureLoanCoverage = (
  schedule: ExpectedTransaction[],
  transactions: TransactionForCoverage[],
  toDate: Date,
): LoanCoverage => {
  const deposits = getDepositsUntilDate(transactions, toDate);
  const withdrawals = getWithdrawalsUntilDate(transactions, toDate);

  const depositsCount = deposits.length;
  const netReceived = getNetReceived(deposits, withdrawals);

  const due = getDueExpectedTransactions(schedule, toDate);

  const amountsKnown = areDueAmountsKnown(due);
  const timeline = amountsKnown
    ? buildAmountBasedCoverageTimeline(due, netReceived)
    : buildCountBasedCoverageTimeline(due, depositsCount, withdrawals.length);

  return {
    timeline,
    netReceived,
    depositsCount,
    amountsKnown,
  };
};

export const calculateOutstandingDeposits = (
  loan: LoanForOutstandingDeposits,
  toDate: Date,
): OutstandingDepositMetrics => {
  const schedule = getExpectedDepositSchedule(loan);
  const coverage = captureLoanCoverage(schedule, loan.transactions, toDate);
  const outstanding = coverage.timeline.filter((entry) => !entry.covered);
  const outstandingDepositSinceDate = outstanding[0]?.date ?? null;

  let outstandingDepositSinceDays: number | null = null;
  if (outstandingDepositSinceDate) {
    const toMoment = moment(toDate).startOf('day');
    const sinceMoment = moment(outstandingDepositSinceDate).startOf('day');
    const daysSince = toMoment.diff(sinceMoment, 'days');
    outstandingDepositSinceDays = Math.max(0, daysSince);
  }

  let outstandingDepositSum: number | null = null;
  if (coverage.amountsKnown) {
    const totalOutstanding = sumUp(outstanding, (entry) => entry.outstandingAmount);
    outstandingDepositSum = round2(totalOutstanding);
  }

  return {
    depositsCount: coverage.depositsCount,
    requiredDepositsCount: schedule.length,
    outstandingDepositsCount: outstanding.length,
    outstandingDepositSum,
    outstandingDepositSinceDate,
    outstandingDepositSinceDays,
  };
};
