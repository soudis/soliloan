import type { TransactionType } from '@prisma/client';
import moment from 'moment';

import { isClosingType } from '@/lib/transactions/closing-types';

type BookableRow = { id: string; bookingDate: Date; amount: number; selectedType: TransactionType | null };

const rank = (row: BookableRow) => {
  if (row.amount > 0) return 0;
  return row.selectedType && isClosingType(row.selectedType) ? 2 : 1;
};

/**
 * The order to book the rows of an import in: oldest calendar day first and, within a day, incoming
 * amounts (Einzahlungen) first and a Rückzahlung last, like the ledger. Each row is checked against
 * the Zahlungen booked before it, so a Rückzahlung has to come after the Einzahlungen it pays back,
 * whatever order the rows were selected in.
 */
export const sortRowsForBooking = <T extends BookableRow>(rows: T[]): T[] => {
  const days = new Map<T, number>(rows.map((row) => [row, moment(row.bookingDate).startOf('day').valueOf()]));
  return [...rows].sort((a, b) => {
    const day = (days.get(a) ?? 0) - (days.get(b) ?? 0);
    if (day !== 0) return day;
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};
