import { CalculationOptions } from '@/types/calculation'
import { LenderWithRelations } from '@/types/lenders'
import { Lender, Loan, Transaction } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { omit } from 'lodash'
import { loansSorter } from '../utils'
import { calculateLoanFields } from './loan-calculations'

type LoanWithTransactions = Loan & {
  transactions?: Transaction[]
}

// Define a base type for the lender with calculations
export type LenderWithCalculations = Lender & {
  totalLoans: number
  totalAmount: number
  totalRemainingAmount: number
  totalInterest: number
  activeLoans: number
  defaultedLoans: number
}

// Define a generic type that can include relations
export type LenderWithCalculationsAndRelations<T = {}> = LenderWithCalculations & T

export function calculateLenderFields<T = {}>(
  lender: LenderWithRelations & T, options: CalculationOptions = {}
) {
  const { client = false } = options ?? {};

  const loans = lender.loans?.map((loan) =>
    calculateLoanFields({ ...loan, lender }, options)
  );
  const sums = loans?.reduce(
    (acc, loan) => ({
      balance: acc.balance + loan.balance,
      interest: acc.interest + loan.interest,
      deposits: acc.deposits + loan.deposits,
      withdrawals: acc.withdrawals + loan.withdrawals,
      interestPaid: acc.interestPaid + loan.interestPaid,
      interestError: acc.interestError + loan.interestError,
      amount: acc.amount + loan.amount,
      interestRate: acc.interestRate + loan.interestRate * loan.amount,
      balanceInterestRate:
        acc.balanceInterestRate + loan.balance * loan.interestRate,
    }),
    {
      balance: 0,
      interest: 0,
      deposits: 0,
      withdrawals: 0,
      interestPaid: 0,
      interestError: 0,
      amount: 0,
      interestRate: 0,
      balanceInterestRate: 0,
    }
  ) ?? {
    balance: 0,
    interest: 0,
    deposits: 0,
    withdrawals: 0,
    interestPaid: 0,
    interestError: 0,
    amount: 0,
    interestRate: 0,
    balanceInterestRate: 0,
  };

  sums.interestRate =
    sums.interestRate > 0 && sums.amount > 0
      ? new Decimal(sums.interestRate).div(sums.amount).toNumber()
      : 0;

  sums.balanceInterestRate =
    sums.balanceInterestRate > 0 && sums.balance > 0
      ? new Decimal(sums.balanceInterestRate).div(sums.balance).toNumber()
      : 0;

  return {
    ...lender,
    loans: loans?.sort(loansSorter) ?? [],
    notes: client
      ? lender.notes.filter((note) => !client || note.public)
      : lender.notes,
    files: lender.files
      .filter((file) => !client || file.public)
      .map((file) => omit(file, "data")),
    ...sums,
  };
} 