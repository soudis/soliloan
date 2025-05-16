import { Lender } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { omit } from 'lodash';

import { CalculationOptions } from '@/types/calculation';
import { LenderWithRelations } from '@/types/lenders';

import { loansSorter } from '../utils';
import { calculateLoanFields } from './loan-calculations';

// Define a base type for the lender with calculations
export type LenderWithCalculations = Lender & {
  totalLoans: number;
  totalAmount: number;
  totalRemainingAmount: number;
  totalInterest: number;
  activeLoans: number;
  defaultedLoans: number;
};

// Define a generic type that can include relations
export type LenderWithCalculationsAndRelations<T> = LenderWithCalculations & T;

export function calculateLenderFields(lender: LenderWithRelations, options: CalculationOptions = {}) {
  const { client = false } = options ?? {};

  const loans = lender.loans?.map((loan) => calculateLoanFields({ ...loan, lender }, options));

  // Initialize sums object
  const sums = {
    balance: 0,
    interest: 0,
    deposits: 0,
    withdrawals: 0,
    interestPaid: 0,
    interestError: 0,
    notReclaimed: 0,
    amount: 0,
    interestRate: 0,
    balanceInterestRate: 0,
  };

  // Use forEach instead of reduce to avoid TypeScript issues
  if (loans && loans.length > 0) {
    loans.forEach((loan) => {
      sums.balance += loan.balance;
      sums.interest += loan.interest;
      sums.deposits += loan.deposits;
      sums.withdrawals += loan.withdrawals;
      sums.interestPaid += loan.interestPaid;
      sums.interestError += loan.interestError;
      sums.notReclaimed += loan.notReclaimed;
      sums.amount += loan.amount;
      sums.interestRate += loan.interestRate * loan.amount;
      sums.balanceInterestRate += loan.balance * loan.interestRate;
    });
  }

  sums.interestRate =
    sums.interestRate > 0 && sums.amount > 0 ? new Decimal(sums.interestRate).div(sums.amount).toNumber() : 0;

  sums.balanceInterestRate =
    sums.balanceInterestRate > 0 && sums.balance > 0
      ? new Decimal(sums.balanceInterestRate).div(sums.balance).toNumber()
      : 0;

  return {
    ...lender,
    loans: loans?.sort(loansSorter) ?? [],
    notes: client ? lender.notes.filter((note) => !client || note.public) : lender.notes,
    files: lender.files.filter((file) => !client || file.public).map((file) => omit(file, 'data')),
    ...sums,
  };
}
