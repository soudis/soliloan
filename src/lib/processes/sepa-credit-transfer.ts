import { Document } from 'sepa';

import { normalizeIban } from '@/lib/utils/iban';

export type SepaCreditTransfer = {
  endToEndId: string;
  creditorName: string;
  iban: string;
  bic?: string | null;
  amount: number;
  remittance: string;
};

/** Stable reason codes for a credit the SEPA library refuses. */
export type SepaRejectReason = 'bicCountry' | 'iban' | 'bic' | 'amount' | 'unknown';

type SepaPartyFields = {
  creditorName: string;
  creditorIBAN: string;
  creditorBIC: string;
  amount: number;
  currency: string;
  remittanceInfo: string;
  end2endId: string;
};

type SepaDebtorFields = {
  requestedExecutionDate: Date;
  debtorName: string;
  debtorIBAN: string;
  debtorBIC: string;
  validate: () => void;
};

function sepaText(value: string, maxLength: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function endToEndId(seed: string): string {
  const compact = seed.replace(/[^A-Za-z0-9]/g, '');
  return `SL${compact}`.slice(0, 35);
}

/** Noon UTC on the UTC calendar day, so the pain.001 date does not shift across time zones. */
export function sepaExecutionDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
}

function fillCredit(tx: SepaPartyFields, credit: SepaCreditTransfer) {
  tx.creditorName = sepaText(credit.creditorName, 70);
  tx.creditorIBAN = normalizeIban(credit.iban);
  const bic = credit.bic?.replace(/\s+/g, '').toUpperCase();
  if (bic) {
    tx.creditorBIC = bic;
  }
  tx.amount = Math.round(credit.amount * 100) / 100;
  tx.currency = 'EUR';
  tx.remittanceInfo = sepaText(credit.remittance, 140);
  tx.end2endId = endToEndId(credit.endToEndId);
}

export function classifySepaError(error: unknown): SepaRejectReason {
  const message = error instanceof Error ? error.message : '';
  if (message === 'country mismatch in BIC/IBAN') return 'bicCountry';
  if (message.includes('invalid IBAN')) return 'iban';
  if (message.includes('BIC')) return 'bic';
  if (message.startsWith('amount')) return 'amount';
  return 'unknown';
}

/** Returns a reason when this credit cannot be written into a SEPA file. */
export function creditSepaError(credit: SepaCreditTransfer): SepaRejectReason | null {
  const doc = new Document('pain.001.001.09');
  const info = doc.createPaymentInfo();
  const tx = info.createTransaction();
  fillCredit(tx, credit);
  try {
    (tx as SepaPartyFields & { validate: () => void }).validate();
    return null;
  } catch (error) {
    return classifySepaError(error);
  }
}

function assertDebtorSepa(args: { debtorName: string; debtorIban: string; debtorBic: string; executionDate: Date }) {
  const doc = new Document('pain.001.001.09');
  const info = doc.createPaymentInfo() as SepaDebtorFields;
  info.requestedExecutionDate = sepaExecutionDate(args.executionDate);
  info.debtorName = sepaText(args.debtorName, 70);
  info.debtorIBAN = normalizeIban(args.debtorIban);
  info.debtorBIC = args.debtorBic.replace(/\s+/g, '').toUpperCase();
  try {
    info.validate();
  } catch {
    throw new Error('error.sepa.debtor');
  }
}

export function buildPain001Xml(args: {
  messageId: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  executionDate: Date;
  credits: SepaCreditTransfer[];
}): { xml: string | null; rejected: { index: number; reason: SepaRejectReason }[] } {
  assertDebtorSepa(args);

  const rejected: { index: number; reason: SepaRejectReason }[] = [];
  const accepted: SepaCreditTransfer[] = [];
  args.credits.forEach((credit, index) => {
    const reason = creditSepaError(credit);
    if (reason) {
      rejected.push({ index, reason });
      return;
    }
    accepted.push(credit);
  });

  if (accepted.length === 0) {
    return { xml: null, rejected };
  }

  const doc = new Document('pain.001.001.09');
  doc.grpHdr.id = sepaText(args.messageId, 35);
  doc.grpHdr.created = new Date();
  doc.grpHdr.initiatorName = sepaText(args.debtorName, 70);

  const info = doc.createPaymentInfo();
  info.requestedExecutionDate = sepaExecutionDate(args.executionDate);
  info.debtorName = sepaText(args.debtorName, 70);
  info.debtorIBAN = normalizeIban(args.debtorIban);
  info.debtorBIC = args.debtorBic.replace(/\s+/g, '').toUpperCase();
  doc.addPaymentInfo(info);

  for (const credit of accepted) {
    const tx = info.createTransaction();
    fillCredit(tx, credit);
    info.addTransaction(tx);
  }

  return { xml: doc.toString(), rejected };
}
