import {
  DurationType,
  type InterestMethod,
  PaymentType,
  Prisma,
  TerminationType,
  TransactionType,
} from '@prisma/client';
import { omit } from 'lodash';
import moment, { type Moment } from 'moment';

import type { CalculationOptions } from '@/types/calculation';
import { LoanStatus, type LoanWithRelations } from '@/types/loans';

import { getLoanTermDays, getRepaymentPeriodDays } from './loan-duration-metrics';
import { createdAtDescSorter, transactionSorter } from '../utils/sorters';

export const isRepaid = (loan: LoanWithRelations, toDate: Date) => {
  // check if all money was paid back until given date
  if (loan.transactions.length <= 1) {
    return undefined;
  }
  const transactions = [...loan.transactions].sort(transactionSorter);
  const lastTransaction = transactions[transactions.length - 1];
  if (!lastTransaction) {
    return undefined;
  }
  return (lastTransaction.type === TransactionType.TERMINATION ||
    lastTransaction.type === TransactionType.NOTRECLAIMED) &&
    moment(lastTransaction.date).isSameOrBefore(toDate)
    ? lastTransaction.date
    : undefined;
};

export const isLoanTerminated = (loan: LoanWithRelations) => {
  return loan.terminationType === TerminationType.TERMINATION && !!loan.terminationDate;
};

export const getLoanStatus = (loan: LoanWithRelations, toDate: Date) => {
  if (loan.transactions.length === 0) {
    return LoanStatus.NOTDEPOSITED;
  }
  if (isRepaid(loan, toDate)) {
    return LoanStatus.REPAID;
  }
  if (isLoanTerminated(loan)) {
    return LoanStatus.TERMINATED;
  }
  return LoanStatus.ACTIVE;
};

const getBaseDays = (method: InterestMethod, date: Moment) => {
  if (method.startsWith('ACT_ACT')) {
    return moment(date).endOf('year').dayOfYear();
  }
  return Number.parseInt(method.split('_')[1] ?? '360', 10);
};

export const getInterestDays = (
  fromDateParameter: Moment | undefined,
  toDateParameter: Moment | undefined,
  interestMethod: InterestMethod,
) => {
  const fromDate = fromDateParameter ? fromDateParameter : moment(toDateParameter).startOf('year');
  const toDate = toDateParameter ? toDateParameter : moment(fromDateParameter).endOf('year');
  const firstYear = !toDateParameter;
  const lastYear = !fromDateParameter;
  if (interestMethod.startsWith('E30_360')) {
    if (toDate.isSameOrBefore(moment(fromDate).endOf('month'))) {
      return moment(toDate).diff(fromDate, 'days');
    }
    let interestDays = Math.max(30 - fromDate.date() + 1, 0);
    const months = moment(toDate).month() - fromDate.month() - 1;
    interestDays += months * 30;
    interestDays += Math.min(moment(toDate).date(), 30);
    interestDays -= lastYear ? 1 : 0;
    interestDays -= !lastYear && !firstYear ? 1 : 0;
    return interestDays;
  }
  return toDate.diff(fromDate, 'days');
};

export const calculateInterestDaily = (
  fromDateParameter: Moment | undefined,
  toDateParameter: Moment | undefined,
  amount: Prisma.Decimal,
  rate: Prisma.Decimal,
  interestMethod: InterestMethod,
) => {
  const toDate = toDateParameter ? toDateParameter : moment(fromDateParameter).endOf('year');
  const interestDays = getInterestDays(fromDateParameter, toDateParameter, interestMethod);
  return new Prisma.Decimal(amount)
    .times(rate)
    .dividedBy(100)
    .times(interestDays)
    .dividedBy(getBaseDays(interestMethod, toDate));
};

const getYearInterestPeriodBounds = (year: number, firstTransactionDate: Moment, toDate: Moment) => {
  const yearStart = moment({ year }).startOf('year');
  const yearEnd = moment({ year }).endOf('year');
  return {
    start: moment.max(firstTransactionDate.clone().startOf('day'), yearStart),
    end: moment.min(toDate.clone().endOf('day'), yearEnd),
  };
};

const allocateYearlyInterestToMonths = (
  yearInterest: Prisma.Decimal,
  monthsInYear: { year: number; month: number }[],
  periodStart: Moment,
  periodEnd: Moment,
  method: InterestMethod,
) => {
  const allocations = new Map<string, Prisma.Decimal>();
  const weights: { key: string; days: number }[] = [];
  let totalDays = 0;

  for (const { year, month } of monthsInYear) {
    const monthStart = moment({ year, month: month - 1 }).startOf('month');
    const monthEnd = moment({ year, month: month - 1 }).endOf('month');
    const effectiveStart = moment.max(monthStart, periodStart);
    const effectiveEnd = moment.min(monthEnd, periodEnd);
    if (effectiveStart.isAfter(effectiveEnd, 'day')) {
      continue;
    }
    const days = getInterestDays(effectiveStart, effectiveEnd, method);
    if (days <= 0) {
      continue;
    }
    weights.push({ key: `${year}-${month}`, days });
    totalDays += days;
  }

  if (weights.length === 0 || yearInterest.isZero()) {
    for (const { year, month } of monthsInYear) {
      allocations.set(`${year}-${month}`, new Prisma.Decimal(0));
    }
    return allocations;
  }

  let allocated = new Prisma.Decimal(0);
  for (let index = 0; index < weights.length; index++) {
    const weight = weights[index];
    if (!weight) {
      continue;
    }
    if (index === weights.length - 1) {
      allocations.set(weight.key, yearInterest.minus(allocated));
      continue;
    }
    const share = yearInterest.times(weight.days).dividedBy(totalDays).toFixed(2);
    const amount = new Prisma.Decimal(share);
    allocations.set(weight.key, amount);
    allocated = allocated.plus(amount);
  }

  for (const { year, month } of monthsInYear) {
    const key = `${year}-${month}`;
    if (!allocations.has(key)) {
      allocations.set(key, new Prisma.Decimal(0));
    }
  }

  return allocations;
};

export const calculateLoanPerYear = (
  loan: LoanWithRelations,
  toDateParameter?: Date,
  currentTransactionId?: string,
) => {
  let toDate = moment(toDateParameter);
  const terminationDate = isRepaid(loan, toDate.toDate());
  // if contract is terminated and the current transaction ID is not the termination transaction only calculate until termination date
  if (terminationDate && loan.transactions[loan.transactions.length - 1]?.id !== currentTransactionId) {
    toDate = moment(terminationDate);
  }

  const method = loan.altInterestMethod ?? loan.lender.project.configuration.interestMethod;

  if (!method) {
    throw new Error('NO_INTEREST_METHOD');
  }

  const compound = method.split('_')[2] === 'COMPOUND';
  const transactions = [...loan.transactions].sort(transactionSorter);
  const firstTransaction = transactions[0];
  if (!firstTransaction) {
    return [];
  }
  const firstYear = moment(firstTransaction.date).year();
  if (firstYear > toDate.year()) {
    return [];
  }
  const lastYear = toDate.year();
  const years = [
    {
      year: firstYear,
      begin: new Prisma.Decimal(0),
      withdrawals: new Prisma.Decimal(0),
      deposits: new Prisma.Decimal(0),
      notReclaimed: new Prisma.Decimal(0),
      interest: new Prisma.Decimal(0),
      interestPaid: new Prisma.Decimal(0),
      interestBaseAmount: new Prisma.Decimal(0), // to calculate with no compound methods
      end: new Prisma.Decimal(0),
      interestError: new Prisma.Decimal(0),
    },
  ];
  for (let year = firstYear; year <= lastYear; year++) {
    const currentYear = years.at(-1);
    if (!currentYear) {
      throw new Error('CURRENT_YEAR_NOT_FOUND');
    }
    let amount = new Prisma.Decimal(currentYear.begin);
    let interestBaseAmount = currentYear.interestBaseAmount;
    // calculate interest for new transactions of year
    let interest = new Prisma.Decimal(0);
    let terminationDate: Moment | undefined;
    transactions
      .filter((transaction) => moment(transaction.date).year() === year)
      .forEach((transaction) => {
        if (toDate.isSameOrAfter(transaction.date) && currentTransactionId !== transaction.id) {
          amount = amount.plus(transaction.amount);
          if (compound || transaction.type !== TransactionType.INTERESTPAYMENT) {
            interestBaseAmount = interestBaseAmount.plus(transaction.amount);
            if (amount.lessThanOrEqualTo(1)) {
              terminationDate = moment(transaction.date);
              interestBaseAmount = new Prisma.Decimal(0);
            } else {
              interest = interest.plus(
                calculateInterestDaily(
                  moment(transaction.date),
                  year === lastYear ? toDate : undefined,
                  new Prisma.Decimal(transaction.amount),
                  new Prisma.Decimal(loan.interestRate),
                  method,
                ),
              );
            }
          }
          switch (transaction.type) {
            case TransactionType.WITHDRAWAL:
            case TransactionType.TERMINATION:
              currentYear.withdrawals = currentYear.withdrawals.plus(transaction.amount);
              break;
            case TransactionType.DEPOSIT:
              currentYear.deposits = currentYear.deposits.plus(transaction.amount);
              break;
            case TransactionType.NOTRECLAIMED:
            case TransactionType.NOTRECLAIMEDPARTIAL:
              currentYear.notReclaimed = currentYear.notReclaimed.plus(transaction.amount);
              break;
            case TransactionType.INTERESTPAYMENT:
              currentYear.interestPaid = currentYear.interestPaid.plus(transaction.amount);
              break;
          }
        }
      });

    // calculate interest for existing balance
    if (year === lastYear || terminationDate) {
      interest = interest.plus(
        calculateInterestDaily(
          undefined,
          terminationDate ?? toDate,
          currentYear.interestBaseAmount,
          new Prisma.Decimal(loan.interestRate),
          method,
        ),
      );
    } else {
      interest = interest.plus(currentYear.interestBaseAmount.times(loan.interestRate).dividedBy(100));
    }
    currentYear.interest = new Prisma.Decimal(interest.toFixed(2));
    currentYear.end = new Prisma.Decimal(amount.plus(currentYear.interest).toFixed(2));
    if (year !== lastYear) {
      years.push({
        end: new Prisma.Decimal(0),
        year: year + 1,
        begin: new Prisma.Decimal(currentYear.end),
        withdrawals: new Prisma.Decimal(0),
        deposits: new Prisma.Decimal(0),
        notReclaimed: new Prisma.Decimal(0),
        interest: new Prisma.Decimal(0),
        interestPaid: new Prisma.Decimal(0),
        interestBaseAmount: interestBaseAmount.plus(compound ? currentYear.interest : 0),
        interestError: new Prisma.Decimal(0),
      });
    } else if (terminationDate && loan.transactions.at(-1)?.id !== currentTransactionId && !currentYear.end.equals(0)) {
      // if contract is terminated and there are small rounding numbers from the past correct interest to adjust to a zero end value
      currentYear.interestError = currentYear.interest.minus(currentYear.end);
      currentYear.interest = currentYear.interest.minus(currentYear.end);
      currentYear.end = new Prisma.Decimal(0);
    }
  }
  return years.map((year) => ({
    year: year.year,
    begin: year.begin,
    end: year.end,
    withdrawals: year.withdrawals,
    deposits: year.deposits,
    notReclaimed: year.notReclaimed,
    interestPaid: year.interestPaid,
    interestBaseAmount: year.interestBaseAmount,
    interest: year.interest,
    interestError: year.interestError,
  }));
};

type LoanPeriodAccumulator = {
  year: number;
  month: number;
  begin: Prisma.Decimal;
  withdrawals: Prisma.Decimal;
  deposits: Prisma.Decimal;
  notReclaimed: Prisma.Decimal;
  interest: Prisma.Decimal;
  interestPaid: Prisma.Decimal;
  interestBaseAmount: Prisma.Decimal;
  end: Prisma.Decimal;
  interestError: Prisma.Decimal;
};

const createEmptyLoanPeriod = (year: number, month: number): LoanPeriodAccumulator => ({
  year,
  month,
  begin: new Prisma.Decimal(0),
  withdrawals: new Prisma.Decimal(0),
  deposits: new Prisma.Decimal(0),
  notReclaimed: new Prisma.Decimal(0),
  interest: new Prisma.Decimal(0),
  interestPaid: new Prisma.Decimal(0),
  interestBaseAmount: new Prisma.Decimal(0),
  end: new Prisma.Decimal(0),
  interestError: new Prisma.Decimal(0),
});

export const calculateLoanPerMonth = (
  loan: LoanWithRelations,
  toDateParameter?: Date,
  currentTransactionId?: string,
) => {
  let toDate = moment(toDateParameter);
  const repaymentDate = isRepaid(loan, toDate.toDate());
  if (repaymentDate && loan.transactions[loan.transactions.length - 1]?.id !== currentTransactionId) {
    toDate = moment(repaymentDate);
  }

  const method = loan.altInterestMethod ?? loan.lender.project.configuration.interestMethod;

  if (!method) {
    throw new Error('NO_INTEREST_METHOD');
  }

  const compound = method.split('_')[2] === 'COMPOUND';
  const transactions = [...loan.transactions].sort(transactionSorter);
  const firstTransaction = transactions[0];
  if (!firstTransaction) {
    return [];
  }

  const perYear = calculateLoanPerYear(loan, toDateParameter, currentTransactionId);
  const perYearByYear = new Map(perYear.map((yearEntry) => [yearEntry.year, yearEntry]));

  const firstMonth = moment(firstTransaction.date).startOf('month');
  const lastMonth = toDate.clone().startOf('month');
  if (firstMonth.isAfter(lastMonth, 'month')) {
    return [];
  }

  const monthsInYearMap = new Map<number, { year: number; month: number }[]>();
  for (let cursor = firstMonth.clone(); cursor.isSameOrBefore(lastMonth, 'month'); cursor.add(1, 'month')) {
    const year = cursor.year();
    const month = cursor.month() + 1;
    const monthsInYear = monthsInYearMap.get(year) ?? [];
    monthsInYear.push({ year, month });
    monthsInYearMap.set(year, monthsInYear);
  }

  const interestByMonthKey = new Map<string, Prisma.Decimal>();
  const interestErrorByMonthKey = new Map<string, Prisma.Decimal>();

  for (const [year, monthsInYear] of monthsInYearMap) {
    const yearEntry = perYearByYear.get(year);
    if (!yearEntry) {
      continue;
    }
    const { start, end } = getYearInterestPeriodBounds(year, moment(firstTransaction.date), toDate);
    const allocations = allocateYearlyInterestToMonths(yearEntry.interest, monthsInYear, start, end, method);
    for (const [key, amount] of allocations) {
      interestByMonthKey.set(key, amount);
    }
    if (!yearEntry.interestError.isZero()) {
      const lastMonthInYear = monthsInYear.at(-1);
      if (lastMonthInYear) {
        interestErrorByMonthKey.set(`${lastMonthInYear.year}-${lastMonthInYear.month}`, yearEntry.interestError);
      }
    }
  }

  const months: LoanPeriodAccumulator[] = [createEmptyLoanPeriod(firstMonth.year(), firstMonth.month() + 1)];

  for (let cursor = firstMonth.clone(); cursor.isSameOrBefore(lastMonth, 'month'); cursor.add(1, 'month')) {
    const currentMonth = months.at(-1);
    if (!currentMonth) {
      throw new Error('CURRENT_MONTH_NOT_FOUND');
    }

    const isLastMonth = cursor.isSame(lastMonth, 'month');
    const year = cursor.year();
    const month = cursor.month() + 1;
    const monthKey = `${year}-${month}`;

    let amount = new Prisma.Decimal(currentMonth.begin);
    let interestBaseAmount = currentMonth.interestBaseAmount;
    let terminationDate: Moment | undefined;

    transactions
      .filter((transaction) => moment(transaction.date).isSame(cursor, 'month'))
      .forEach((transaction) => {
        if (toDate.isSameOrAfter(transaction.date) && currentTransactionId !== transaction.id) {
          amount = amount.plus(transaction.amount);
          if (compound || transaction.type !== TransactionType.INTERESTPAYMENT) {
            interestBaseAmount = interestBaseAmount.plus(transaction.amount);
            if (amount.lessThanOrEqualTo(1)) {
              terminationDate = moment(transaction.date);
              interestBaseAmount = new Prisma.Decimal(0);
            }
          }
          switch (transaction.type) {
            case TransactionType.WITHDRAWAL:
            case TransactionType.TERMINATION:
              currentMonth.withdrawals = currentMonth.withdrawals.plus(transaction.amount);
              break;
            case TransactionType.DEPOSIT:
              currentMonth.deposits = currentMonth.deposits.plus(transaction.amount);
              break;
            case TransactionType.NOTRECLAIMED:
            case TransactionType.NOTRECLAIMEDPARTIAL:
              currentMonth.notReclaimed = currentMonth.notReclaimed.plus(transaction.amount);
              break;
            case TransactionType.INTERESTPAYMENT:
              currentMonth.interestPaid = currentMonth.interestPaid.plus(transaction.amount);
              break;
          }
        }
      });

    currentMonth.interest = interestByMonthKey.get(monthKey) ?? new Prisma.Decimal(0);
    currentMonth.interestError = interestErrorByMonthKey.get(monthKey) ?? new Prisma.Decimal(0);
    currentMonth.end = new Prisma.Decimal(amount.plus(currentMonth.interest).toFixed(2));

    const lastYearEntry = perYear.at(-1);
    if (
      isLastMonth &&
      lastYearEntry?.end.isZero() &&
      !currentMonth.end.isZero() &&
      terminationDate &&
      loan.transactions.at(-1)?.id !== currentTransactionId
    ) {
      currentMonth.interestError = currentMonth.interestError.plus(currentMonth.end);
      currentMonth.interest = currentMonth.interest.minus(currentMonth.end);
      currentMonth.end = new Prisma.Decimal(0);
    }

    if (!isLastMonth) {
      const nextMonth = cursor.clone().add(1, 'month');
      const crossesYearBoundary = nextMonth.year() !== year;
      const yearEntry = perYearByYear.get(year);
      months.push({
        ...createEmptyLoanPeriod(nextMonth.year(), nextMonth.month() + 1),
        begin: new Prisma.Decimal(currentMonth.end),
        interestBaseAmount: interestBaseAmount.plus(
          compound && crossesYearBoundary && yearEntry ? yearEntry.interest : 0,
        ),
      });
    }
  }

  return months.map((entry) => ({
    year: entry.year,
    month: entry.month,
    begin: entry.begin,
    end: entry.end,
    withdrawals: entry.withdrawals,
    deposits: entry.deposits,
    notReclaimed: entry.notReclaimed,
    interestPaid: entry.interestPaid,
    interestBaseAmount: entry.interestBaseAmount,
    interest: entry.interest,
    interestError: entry.interestError,
  }));
};

const calculateNumbersToDate = (
  loan: LoanWithRelations,
  toDate: Date | undefined = undefined,
  interestYearParameter: number | undefined = undefined,
  currentTransactionId: string | undefined = undefined,
) => {
  const interestYear = interestYearParameter ?? moment(toDate).subtract(1, 'year').year();
  const perYear = calculateLoanPerYear(loan, toDate, currentTransactionId);
  return {
    toDate: perYear.reduce(
      (total, entry) => ({
        balance: entry.end,
        withdrawals: total.withdrawals.plus(entry.withdrawals),
        deposits: total.deposits.plus(entry.deposits),
        notReclaimed: total.notReclaimed.plus(entry.notReclaimed),
        interestPaid: total.interestPaid.plus(entry.interestPaid),
        interest: total.interest.plus(entry.interest),
        interestOfYear: entry.year === interestYear ? entry.interest : total.interestOfYear,
        interestError: total.interestError.plus(entry.interestError),
      }),
      {
        balance: new Prisma.Decimal(0),
        withdrawals: new Prisma.Decimal(0),
        deposits: new Prisma.Decimal(0),
        notReclaimed: new Prisma.Decimal(0),
        interestPaid: new Prisma.Decimal(0),
        interest: new Prisma.Decimal(0),
        interestOfYear: new Prisma.Decimal(0),
        interestError: new Prisma.Decimal(0),
      },
    ),
    perYear,
  };
};

export const getRepayDate = (loan: LoanWithRelations) => {
  switch (loan.terminationType) {
    case TerminationType.TERMINATION:
      return loan.terminationDate
        ? moment(loan.terminationDate)
            .add(loan.terminationPeriod, loan.terminationPeriodType === DurationType.MONTHS ? 'months' : 'years')
            .toDate()
        : null;
    case TerminationType.DURATION:
      return moment(loan.signDate)
        .add(loan.duration, loan.durationType === DurationType.MONTHS ? 'months' : 'years')
        .toDate();
    case TerminationType.ENDDATE:
      return loan.endDate;
    default:
      return undefined;
  }
};

const getInterestBookingDate = (year: number, toDate: Date, repaidDate: Date | false | undefined) => {
  if (repaidDate && moment(repaidDate).year() === year) {
    return repaidDate;
  }
  return moment(toDate).year() === year ? moment(toDate).toDate() : moment().set('year', year).endOf('year').toDate();
};

export function calculateLoanFields<T>(loan: LoanWithRelations & T, options: CalculationOptions = {}) {
  const { toDate = new Date(), interestYear = moment().year(), client = false } = options ?? {};
  const numbers = calculateNumbersToDate(loan, toDate, interestYear);
  const isTerminated = isLoanTerminated(loan);
  const repaidDate = isRepaid(loan, toDate);

  return {
    ...loan,
    notes: (client ? loan.notes.filter((note) => note.public) : loan.notes).sort(createdAtDescSorter),
    files: loan.files
      .filter((file) => !client || file.public)
      .map((file) => omit(file, 'data'))
      .sort(createdAtDescSorter),
    repaidDate: isRepaid(loan, toDate),
    isTerminated,
    repayDate: getRepayDate(loan),
    status: getLoanStatus(loan, toDate),
    amount: loan.amount,
    interestRate: loan.interestRate,
    // add calculated totals (balance, withdrawals, deposits, notReclaimed, interestPaid, interest)
    balance: numbers.toDate.balance.toNumber(),
    withdrawals: numbers.toDate.withdrawals.toNumber(),
    deposits: numbers.toDate.deposits.toNumber(),
    notReclaimed: numbers.toDate.notReclaimed.toNumber(),
    interestPaid: numbers.toDate.interestPaid.toNumber(),
    interest: numbers.toDate.interest.toNumber(),
    // if interest calculation found large errors show warning
    interestError: numbers.toDate.interestError.toNumber(),
    loanTermDays: getLoanTermDays(loan, toDate),
    repaymentPeriodDays: getRepaymentPeriodDays(loan, toDate),
    // add interests per year as virtual transactions
    transactions: loan.transactions
      .map((transaction) => ({
        ...transaction,
        amount: transaction.amount,
      }))
      .concat(
        numbers.perYear
          .filter((numbers) => numbers.interest.toNumber() > 0)
          .map((numbers) => ({
            id: `${numbers.year}-interest`,
            type: TransactionType.INTEREST,
            date: getInterestBookingDate(numbers.year, toDate, repaidDate),
            amount: numbers.interest.toNumber(),
            paymentType: PaymentType.OTHER,
            loanId: loan.id,
          })),
      )
      .sort(transactionSorter),
  };
}
