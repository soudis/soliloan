import { PaymentType, TransactionType } from '@prisma/client';

/** Applies the same sign rules as add-transaction.ts. */
export function getSignedTransactionAmount(type: TransactionType, amountMagnitude: number): number {
  const abs = Math.abs(amountMagnitude);
  if (
    type === TransactionType.WITHDRAWAL ||
    type === TransactionType.TERMINATION ||
    type === TransactionType.INTERESTPAYMENT ||
    type === TransactionType.NOTRECLAIMEDPARTIAL ||
    type === TransactionType.NOTRECLAIMED
  ) {
    return -abs;
  }
  return abs;
}

export const BANK_IMPORT_PAYMENT_TYPE = PaymentType.BANK;

export const DEBIT_TRANSACTION_TYPES = [
  TransactionType.WITHDRAWAL,
  TransactionType.INTERESTPAYMENT,
  TransactionType.TERMINATION,
] as const;
