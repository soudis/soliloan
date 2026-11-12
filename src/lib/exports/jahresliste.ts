import { type NotificationType, Prisma, TransactionType } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear, isRepaid } from '@/lib/calculations/loan-calculations';
import { payoutAsOfDate } from '@/lib/processes/yearly-interest';
import type { LoanWithRelations } from '@/types/loans';

/** The Vorgänge of a Jahresliste, in the order of the Summen sheet. */
export const JAHRESLISTE_VORGAENGE = [
  'OPENING_BALANCE',
  TransactionType.DEPOSIT,
  TransactionType.INTERESTCARRYOVER,
  TransactionType.INTEREST,
  TransactionType.INTERESTPAYMENT,
  TransactionType.WITHDRAWAL,
  TransactionType.TERMINATION,
  TransactionType.NOTRECLAIMEDPARTIAL,
  TransactionType.NOTRECLAIMED,
  'CLOSING_BALANCE',
] as const;

export type JahreslisteVorgang = (typeof JAHRESLISTE_VORGAENGE)[number];

export const JAHRESLISTE_VORGANG_LABELS: Record<JahreslisteVorgang, string> = {
  OPENING_BALANCE: 'Kontostand Jahresbeginn',
  DEPOSIT: 'Einzahlung',
  INTERESTCARRYOVER: 'Zinsübertrag',
  INTEREST: 'Zinsertrag',
  INTERESTPAYMENT: 'Zinsauszahlung',
  WITHDRAWAL: 'Teilrückzahlung',
  TERMINATION: 'Rückzahlung',
  NOTRECLAIMEDPARTIAL: 'Teilerlassung',
  NOTRECLAIMED: 'Erlassung',
  CLOSING_BALANCE: 'Kontostand Jahresende',
};

export type JahreslisteRow = {
  lenderId: string;
  lenderNumber: number;
  lastName: string;
  firstName: string;
  loanNumber: number;
  vorgang: JahreslisteVorgang;
  /** The calendar day at UTC midnight, so spreadsheets show the same day in every time zone. */
  date: Date;
  amount: number;
  interestRate: number;
  /** The Zinsertrag of the year, on the Kontostand Jahresende row only. */
  interestAmount: number | null;
};

export type JahreslisteSum = { vorgang: JahreslisteVorgang; amount: number };

export type JahreslisteLender = {
  id: string;
  lenderNumber: number;
  notificationType: NotificationType;
};

export type Jahresliste = {
  rows: JahreslisteRow[];
  sums: JahreslisteSum[];
  /** The Kreditgeber*innen with at least one row, by Kreditgeber*in-Nr.: the same ones get a Kontomitteilung. */
  lenders: JahreslisteLender[];
};

const calendarDay = (date: Date) => {
  const local = moment(date);
  return new Date(Date.UTC(local.year(), local.month(), local.date()));
};

const vorgangOrder = (vorgang: JahreslisteVorgang) => JAHRESLISTE_VORGAENGE.indexOf(vorgang);

const byDateVorgangName = (a: JahreslisteRow, b: JahreslisteRow) =>
  a.date.getTime() - b.date.getTime() ||
  vorgangOrder(a.vorgang) - vorgangOrder(b.vorgang) ||
  a.lastName.localeCompare(b.lastName, 'de') ||
  a.firstName.localeCompare(b.firstName, 'de') ||
  a.lenderNumber - b.lenderNumber ||
  a.loanNumber - b.loanNumber;

function loanRows(loan: LoanWithRelations, year: number): JahreslisteRow[] {
  const asOf = payoutAsOfDate(year);
  const entry = calculateLoanPerYear(loan, asOf).find((perYear) => perYear.year === year);
  if (!entry) {
    return [];
  }

  const { lender } = loan;
  const base = {
    lenderId: lender.id,
    lenderNumber: lender.lenderNumber,
    lastName: lender.organisationName || lender.lastName || '',
    firstName: lender.organisationName ? '' : (lender.firstName ?? ''),
    loanNumber: loan.loanNumber,
    interestRate: new Prisma.Decimal(loan.interestRate).toNumber(),
    interestAmount: null,
  };
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const repaidDate = isRepaid(loan, asOf);
  const closedInYear = repaidDate && moment(repaidDate).year() === year ? repaidDate : undefined;

  const rows: JahreslisteRow[] = [];
  if (entry.begin.greaterThan(0)) {
    rows.push({ ...base, vorgang: 'OPENING_BALANCE', date: yearStart, amount: entry.begin.toNumber() });
  }
  for (const transaction of loan.transactions) {
    if (moment(transaction.date).year() !== year || transaction.type === TransactionType.INTEREST) {
      continue;
    }
    rows.push({
      ...base,
      vorgang: transaction.type,
      date: calendarDay(transaction.date),
      amount: new Prisma.Decimal(transaction.amount).toNumber(),
    });
  }
  rows.push({
    ...base,
    vorgang: TransactionType.INTEREST,
    date: closedInYear ? calendarDay(closedInYear) : yearEnd,
    amount: entry.interest.toNumber(),
  });
  // A closed Kredit ends at 0 after the Zinskorrektur. Keep the row if it does not, so the Summen still add up.
  if (!closedInYear || !entry.end.isZero()) {
    rows.push({
      ...base,
      vorgang: 'CLOSING_BALANCE',
      date: yearEnd,
      amount: entry.end.toNumber(),
      interestAmount: entry.interest.toNumber(),
    });
  }
  return rows;
}

/**
 * The Jahresliste of one calendar year: one row per Kreditgeber*in × Kredit × Vorgang, and the Summen.
 * Figures come from the interest engine as of the end of the year, so the current year is a forecast to 31 Dec.
 */
export function buildJahresliste(loans: LoanWithRelations[], year: number): Jahresliste {
  const rows = loans.flatMap((loan) => loanRows(loan, year)).sort(byDateVorgangName);

  const totals = new Map<JahreslisteVorgang, Prisma.Decimal>(
    JAHRESLISTE_VORGAENGE.map((vorgang) => [vorgang, new Prisma.Decimal(0)]),
  );
  for (const row of rows) {
    totals.set(row.vorgang, (totals.get(row.vorgang) ?? new Prisma.Decimal(0)).plus(row.amount));
  }

  const lenderIds = new Set(rows.map((row) => row.lenderId));
  return {
    rows,
    // A Zinsübertrag only exists in the Stichtag year of an Import; other years keep the usual Summen.
    sums: JAHRESLISTE_VORGAENGE.filter(
      (vorgang) => vorgang !== TransactionType.INTERESTCARRYOVER || rows.some((row) => row.vorgang === vorgang),
    ).map((vorgang) => ({
      vorgang,
      amount: (totals.get(vorgang) ?? new Prisma.Decimal(0)).toDecimalPlaces(2).toNumber(),
    })),
    lenders: [...new Map(loans.map((loan) => [loan.lender.id, loan.lender])).values()]
      .filter((lender) => lenderIds.has(lender.id))
      .map(({ id, lenderNumber, notificationType }) => ({ id, lenderNumber, notificationType }))
      .sort((a, b) => a.lenderNumber - b.lenderNumber),
  };
}
