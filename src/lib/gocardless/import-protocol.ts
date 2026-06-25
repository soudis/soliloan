import type { TransactionType } from '@prisma/client';

export const BANK_IMPORT_SKIP_REASONS = ['rowNotFound', 'incompleteAssignment', 'loanMismatch', 'notEligible'] as const;

export type BankImportSkipReason = (typeof BANK_IMPORT_SKIP_REASONS)[number];

export type BankImportProtocolRow = {
  rowId: string;
  bookingDate: string;
  amount: number;
  currency: string;
  counterpartyName: string | null;
  remittanceInfo: string | null;
};

export type BankImportProtocolImportedRow = BankImportProtocolRow & {
  transactionId: string;
  loanNumber: number;
  lenderName: string;
  type: TransactionType;
};

export type BankImportProtocolSkippedRow = BankImportProtocolRow & {
  reason: BankImportSkipReason;
};

export type BankImportProtocol = {
  imported: BankImportProtocolImportedRow[];
  skipped: BankImportProtocolSkippedRow[];
  importedCount: number;
  skippedCount: number;
};
