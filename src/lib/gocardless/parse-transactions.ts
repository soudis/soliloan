import type {
  GoCardlessAccountDetails,
  GoCardlessAccountTransactionsResponse,
  GoCardlessBankTransaction,
  ParsedBankTransaction,
} from './types';

/** Parses booked GoCardless transactions into normalized import rows. */
export function parseBookedTransactions(booked: GoCardlessBankTransaction[]): ParsedBankTransaction[] {
  const byId = new Map<string, ParsedBankTransaction>();

  for (const tx of booked) {
    const bankTransactionId = tx.transactionId ?? tx.internalTransactionId;
    if (!bankTransactionId || !tx.bookingDate || !tx.transactionAmount?.currency) {
      continue;
    }

    const amount = Number.parseFloat(tx.transactionAmount.amount);
    if (Number.isNaN(amount)) {
      continue;
    }

    const isCredit = amount > 0;
    const counterpartyName = isCredit ? (tx.debtorName ?? null) : (tx.creditorName ?? null);
    const counterpartyIban = isCredit ? (tx.debtorAccount?.iban ?? null) : (tx.creditorAccount?.iban ?? null);
    const remittanceInfo = tx.remittanceInformationUnstructured ?? tx.remittanceInformationStructured ?? null;

    byId.set(bankTransactionId, {
      bankTransactionId,
      bookingDate: new Date(tx.bookingDate),
      valueDate: tx.valueDate ? new Date(tx.valueDate) : null,
      amount,
      currency: tx.transactionAmount.currency,
      counterpartyName,
      counterpartyIban,
      remittanceInfo,
      raw: tx,
    });
  }

  return [...byId.values()].sort((a, b) => b.bookingDate.getTime() - a.bookingDate.getTime());
}

export function formatDateForGoCardless(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type { GoCardlessAccountDetails, GoCardlessAccountTransactionsResponse, ParsedBankTransaction };
