import { TransactionType } from '@prisma/client';

/** The types of an Abschlusszahlung: a Rückzahlung or an Erlassung closes the Kredit. */
export const CLOSING_TYPES: TransactionType[] = [TransactionType.TERMINATION, TransactionType.NOTRECLAIMED];

export const isClosingType = (type: TransactionType) => CLOSING_TYPES.includes(type);
