import {
  DurationType,
  InterestMethod,
  PaymentType,
  TerminationType,
  TransactionType,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { omit } from "lodash";
import moment, { Moment } from "moment";

import { CalculationOptions } from "@/types/calculation";
import { LoanStatus, LoanWithRelations } from "@/types/loans";

import { transactionSorter } from "../utils";

export const isRepaid = (loan: LoanWithRelations, toDate: Date) => {
  // check if all money was paid back until given date
  if (loan.transactions.length <= 1) {
    return undefined;
  } else {
    const transactions = loan.transactions.sort(transactionSorter);
    const lastTransaction = transactions[transactions.length - 1];
    if (!lastTransaction) {
      return undefined;
    }
    return (lastTransaction.type === TransactionType.TERMINATION ||
      lastTransaction.type === TransactionType.NOTRECLAIMED) &&
      moment(lastTransaction.date).isSameOrBefore(toDate)
      ? lastTransaction.date
      : undefined;
  }
};

export const isLoanTerminated = (loan: LoanWithRelations) => {
  return (
    loan.terminationType === TerminationType.TERMINATION &&
    !!loan.terminationDate
  );
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
  if (method.startsWith("ACT_ACT")) {
    return moment(date).endOf("year").dayOfYear();
  } else {
    return parseInt(method.split("_")[1] ?? "360");
  }
};

export const calculateInterestDaily = (
  fromDateParameter: Moment | undefined,
  toDateParameter: Moment | undefined,
  amount: Decimal,
  rate: Decimal,
  interestMethod: InterestMethod
) => {
  const fromDate = fromDateParameter
    ? fromDateParameter
    : moment(toDateParameter).startOf("year");
  const toDate = toDateParameter
    ? toDateParameter
    : moment(fromDateParameter).endOf("year");
  const firstYear = !toDateParameter;
  const lastYear = !fromDateParameter;
  let interestDays = 0;
  if (interestMethod.startsWith("E30_360")) {
    if (toDate.isSameOrBefore(moment(fromDate).endOf("month"))) {
      // if the dates are in the same month
      interestDays = moment(toDate).diff(fromDate, "days");
    } else {
      // days in first month
      interestDays = Math.max(30 - fromDate.date() + 1, 0);
      // months * 30
      const months = moment(toDate).month() - fromDate.month() - 1;
      interestDays += months * 30;
      // days in last month
      interestDays += Math.min(moment(toDate).date(), 30);
      interestDays -= lastYear ? 1 : 0;
      interestDays -= !lastYear && !firstYear ? 1 : 0;
    }
  } else {
    interestDays = toDate.diff(fromDate, "days");
  }
  return new Decimal(amount)
    .times(rate)
    .dividedBy(100)
    .times(interestDays)
    .dividedBy(getBaseDays(interestMethod, toDate));
};

export const calculateLoanPerYear = function (
  loan: LoanWithRelations,
  toDateParameter?: Date,
  currentTransactionId?: string
) {
  let toDate = moment(toDateParameter);
  const terminationDate = isRepaid(loan, toDate.toDate());
  // if contract is terminated and the current transaction ID is not the termination transaction only calculate until termination date
  if (
    !!terminationDate &&
    loan.transactions[loan.transactions.length - 1]?.id !== currentTransactionId
  ) {
    toDate = moment(terminationDate);
  }

  const method =
    loan.altInterestMethod ?? loan.lender.project.configuration.interestMethod;

  if (!method) {
    throw new Error("NO_INTEREST_METHOD");
  }

  const compound = method.split("_")[2] === "COMPOUND";
  const transactions = loan.transactions.sort(transactionSorter);
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
      begin: new Decimal(0),
      withdrawals: new Decimal(0),
      deposits: new Decimal(0),
      notReclaimed: new Decimal(0),
      interest: new Decimal(0),
      interestPaid: new Decimal(0),
      interestBaseAmount: new Decimal(0), // to calculate with no compound methods
      end: new Decimal(0),
      interestError: new Decimal(0),
    },
  ];
  for (let year = firstYear; year <= lastYear; year++) {
    const currentYear = years.at(-1)!;
    let amount = new Decimal(currentYear.begin);
    let interestBaseAmount = currentYear.interestBaseAmount;
    // calculate interest for new transactions of year
    let interest = new Decimal(0);
    let terminationDate = undefined;
    transactions
      .filter((transaction) => moment(transaction.date).year() === year)
      .forEach((transaction) => {
        if (
          toDate.isSameOrAfter(transaction.date) &&
          currentTransactionId != transaction.id
        ) {
          amount = amount.plus(transaction.amount);
          if (
            compound ??
            transaction.type !== TransactionType.INTERESTPAYMENT
          ) {
            interestBaseAmount = interestBaseAmount.plus(transaction.amount);
            if (amount.lessThanOrEqualTo(1)) {
              terminationDate = moment(transaction.date);
              interestBaseAmount = new Decimal(0);
            } else {
              interest = interest.plus(
                calculateInterestDaily(
                  moment(transaction.date),
                  year === lastYear ? toDate : undefined,
                  new Decimal(transaction.amount),
                  new Decimal(loan.interestRate),
                  method
                )
              );
            }
          }
          switch (transaction.type) {
            case TransactionType.WITHDRAWAL:
            case TransactionType.TERMINATION:
              currentYear.withdrawals = currentYear.withdrawals.plus(
                transaction.amount
              );
              break;
            case TransactionType.DEPOSIT:
              currentYear.deposits = currentYear.deposits.plus(
                transaction.amount
              );
              break;
            case TransactionType.NOTRECLAIMED:
            case TransactionType.NOTRECLAIMEDPARTIAL:
              currentYear.notReclaimed = currentYear.notReclaimed.plus(
                transaction.amount
              );
              break;
            case TransactionType.INTERESTPAYMENT:
              currentYear.interestPaid = currentYear.interestPaid.plus(
                transaction.amount
              );
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
          new Decimal(loan.interestRate),
          method
        )
      );
    } else {
      interest = interest.plus(
        currentYear.interestBaseAmount.times(loan.interestRate).dividedBy(100)
      );
    }
    currentYear.interest = new Decimal(interest.toFixed(2));
    currentYear.end = new Decimal(amount.plus(currentYear.interest).toFixed(2));
    if (year !== lastYear) {
      years.push({
        end: new Decimal(0),
        year: year + 1,
        begin: new Decimal(currentYear.end),
        withdrawals: new Decimal(0),
        deposits: new Decimal(0),
        notReclaimed: new Decimal(0),
        interest: new Decimal(0),
        interestPaid: new Decimal(0),
        interestBaseAmount: interestBaseAmount.plus(
          compound ? currentYear.interest : 0
        ),
        interestError: new Decimal(0),
      });
    } else if (
      terminationDate &&
      loan.transactions.at(-1)?.id !== currentTransactionId &&
      !currentYear.end.equals(0)
    ) {
      // if contract is terminated and there are small rounding numbers from the past correct interest to adjust to a zero end value
      currentYear.interestError = currentYear.interest.minus(currentYear.end);
      currentYear.interest = currentYear.interest.minus(currentYear.end);
      currentYear.end = new Decimal(0);
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

const calculateNumbersToDate = (
  loan: LoanWithRelations,
  toDate: Date | undefined = undefined,
  interestYearParameter: number | undefined = undefined,
  currentTransactionId: string | undefined = undefined
) => {
  const interestYear =
    interestYearParameter ?? moment(toDate).subtract(1, "year").year();
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
        interestOfYear:
          entry.year === interestYear ? entry.interest : total.interestOfYear,
        interestError: total.interestError.plus(entry.interestError),
      }),
      {
        balance: new Decimal(0),
        withdrawals: new Decimal(0),
        deposits: new Decimal(0),
        notReclaimed: new Decimal(0),
        interestPaid: new Decimal(0),
        interest: new Decimal(0),
        interestOfYear: new Decimal(0),
        interestError: new Decimal(0),
      }
    ),
    perYear,
  };
};

export const getRepayDate = (loan: LoanWithRelations) => {
  switch (loan.terminationType) {
    case TerminationType.TERMINATION:
      return loan.terminationDate
        ? moment(loan.terminationDate)
            .add(
              loan.terminationPeriod,
              loan.terminationPeriodType === DurationType.MONTHS
                ? "months"
                : "years"
            )
            .toDate()
        : null;
    case TerminationType.DURATION:
      return moment(loan.signDate)
        .add(
          loan.duration,
          loan.durationType === DurationType.MONTHS ? "months" : "years"
        )
        .toDate();
    case TerminationType.ENDDATE:
      return loan.endDate;
    default:
      return undefined;
  }
};

const getInterestBookingDate = (
  year: number,
  toDate: Date,
  repaidDate: Date | false | undefined
) => {
  if (repaidDate && moment(repaidDate).year() === year) {
    return repaidDate;
  }
  return moment(toDate).year() === year
    ? moment(toDate).toDate()
    : moment().set("year", year).endOf("year").toDate();
};

export function calculateLoanFields<T>(
  loan: LoanWithRelations & T,
  options: CalculationOptions = {}
) {
  const {
    toDate = new Date(),
    interestYear = moment().year(),
    client = false,
  } = options ?? {};
  const numbers = calculateNumbersToDate(loan, toDate, interestYear);
  const isTerminated = isLoanTerminated(loan);
  const repaidDate = isRepaid(loan, toDate);

  return {
    ...loan,
    notes: client
      ? loan.notes.filter((note) => !client || note.public)
      : loan.notes,
    files: loan.files
      .filter((file) => !client || file.public)
      .map((file) => omit(file, "data")),
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
          }))
      )
      .sort(transactionSorter),
  };
}
