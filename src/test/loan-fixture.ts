import {
  type InterestMethod,
  type InterestPaymentType,
  PaymentType,
  type Transaction,
  TransactionType,
} from '@prisma/client';

import type { LoanWithRelations } from '@/types/loans';

type FixtureTransaction = {
  type: TransactionType;
  date: Date;
  amount: number;
};

type FixtureLender = {
  id?: string;
  lenderNumber?: number;
  firstName?: string;
  lastName?: string;
  notificationType?: 'ONLINE' | 'EMAIL' | 'POST';
};

let counter = 0;

/** Builds a Kredit with just the fields the interest engine and the Exporte read. */
export function fixtureLoan(options: {
  id?: string;
  loanNumber?: number;
  interestRate: number;
  interestMethod: InterestMethod;
  interestPaymentType?: InterestPaymentType;
  transactions: FixtureTransaction[];
  lender?: FixtureLender;
}): LoanWithRelations {
  counter += 1;
  const id = options.id ?? `loan-${counter}`;
  const transactions: Transaction[] = options.transactions.map((transaction, index) => ({
    id: `${id}-tx-${index}`,
    loanId: id,
    type: transaction.type,
    date: transaction.date,
    amount: transaction.amount,
    paymentType: PaymentType.BANK,
    lenderNotifiedAt: null,
  }));
  return {
    id,
    loanNumber: options.loanNumber ?? counter,
    interestRate: options.interestRate,
    interestPaymentType: options.interestPaymentType ?? 'END',
    altInterestMethod: null,
    transactions,
    lender: {
      id: options.lender?.id ?? `lender-${counter}`,
      lenderNumber: options.lender?.lenderNumber ?? counter,
      firstName: options.lender?.firstName ?? 'Anna',
      lastName: options.lender?.lastName ?? 'Beispiel',
      organisationName: null,
      type: 'PERSON',
      notificationType: options.lender?.notificationType ?? 'EMAIL',
      project: { configuration: { interestMethod: options.interestMethod } },
    },
  } as unknown as LoanWithRelations;
}

export const tx = (type: TransactionType, date: Date, amount: number): FixtureTransaction => ({ type, date, amount });
export const { DEPOSIT, WITHDRAWAL, TERMINATION, INTERESTPAYMENT, NOTRECLAIMED, NOTRECLAIMEDPARTIAL } =
  TransactionType;
