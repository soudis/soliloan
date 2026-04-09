import { Prisma, type TemplateDataset, type Transaction, TransactionType } from '@prisma/client';

import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { calculateLoanFields, calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import { formatCurrency, formatDate, formatPercentage, getLenderName } from '@/lib/utils';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { transactionSorter } from '@/lib/utils/sorters';
import type { LenderWithRelations } from '@/types/lenders';
import type { LoanWithRelations } from '@/types/loans';

/** Options for template rendering (e.g. reporting year for `LENDER_YEARLY`). */
export type TemplateDataOptions = {
  year?: number;
};

const fileSelect = {
  id: true,
  name: true,
  description: true,
  public: true,
  mimeType: true,
  lenderId: true,
  loanId: true,
  thumbnail: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.FileSelect;

const noteInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.NoteInclude;

const lenderTemplateInclude = {
  project: {
    include: {
      configuration: { select: { interestMethod: true } },
    },
  },
  loans: {
    include: {
      transactions: true,
      notes: {
        include: noteInclude,
      },
      files: {
        select: fileSelect,
      },
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      lastLogin: true,
      lastInvited: true,
    },
  },
  notes: {
    include: noteInclude,
  },
  files: {
    select: fileSelect,
  },
} satisfies Prisma.LenderInclude;

const loanTemplateInclude = {
  lender: {
    include: {
      project: {
        include: {
          configuration: { select: { interestMethod: true } },
        },
      },
      loans: {
        include: {
          transactions: true,
          notes: {
            include: noteInclude,
          },
          files: {
            select: fileSelect,
          },
        },
      },
      notes: {
        include: noteInclude,
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          lastLogin: true,
          lastInvited: true,
        },
      },
      files: {
        select: fileSelect,
      },
    },
  },
  transactions: true,
  notes: {
    include: noteInclude,
  },
  files: {
    select: fileSelect,
  },
} satisfies Prisma.LoanInclude;

function getPlatformData() {
  return {
    name: process.env.NEXT_PUBLIC_SOLILOAN_PROJECT_NAME ?? 'SoliLoan',
  };
}

async function getConfigData(projectId: string): Promise<Record<string, string>> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      configuration: {
        select: {
          name: true,
          logo: true,
          email: true,
          telNo: true,
          website: true,
          street: true,
          addon: true,
          zip: true,
          place: true,
          country: true,
          iban: true,
          bic: true,
        },
      },
    },
  });

  const config = project?.configuration;
  if (!config) return {};

  return {
    name: config.name ?? '',
    logo: config.logo ?? '',
    email: config.email ?? '',
    telNo: config.telNo ?? '',
    website: config.website ?? '',
    street: config.street ?? '',
    addon: config.addon ?? '',
    zip: config.zip ?? '',
    place: config.place ?? '',
    country: config.country ?? '',
    fullAddress: [config.street, config.addon, `${config.zip ?? ''} ${config.place ?? ''}`.trim()]
      .filter(Boolean)
      .join(', '),
    iban: config.iban ?? '',
    bic: config.bic ?? '',
  };
}

async function getCalculatedLender(lenderId: string) {
  const lender = await db.lender.findUnique({
    where: { id: lenderId },
    include: lenderTemplateInclude,
  });

  if (!lender) return null;

  return calculateLenderFields(
    parseAdditionalFields({
      ...lender,
      loans: lender.loans.map((loan) => parseAdditionalFields(loan)),
    }),
  );
}

async function getCalculatedLoan(loanId: string) {
  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: loanTemplateInclude,
  });

  if (!loan) return null;

  const calculatedLender = calculateLenderFields(
    parseAdditionalFields({
      ...loan.lender,
      loans: loan.lender.loans.map((relatedLoan) => parseAdditionalFields(relatedLoan)),
    }),
  );

  return calculateLoanFields(parseAdditionalFields({ ...loan, lender: calculatedLender }));
}

type TemplateNoteRecord = Record<string, unknown> & {
  createdAt: Date | string | null;
  createdBy?: { name: string | null } | null;
};

type TemplateTransactionRecord = Record<string, unknown> & {
  amount: number;
  date: Date | string | null;
};

type TemplateLoanRecord = Record<string, unknown> & {
  amount: number;
  interestRate: number;
  signDate: Date | string | null;
  endDate: Date | string | null;
  terminationDate: Date | string | null;
  balance: number;
  interest: number;
  deposits: number;
  withdrawals: number;
  interestPaid: number;
  interestError: number;
  notReclaimed: number;
  repaidDate?: Date | string | null;
  repayDate?: Date | string | null;
  isTerminated?: boolean;
  transactions?: TemplateTransactionRecord[];
  notes?: TemplateNoteRecord[];
};

type TemplateLenderRecord = Record<string, unknown> & {
  type?: 'PERSON' | 'ORGANISATION';
  salutation?: string;
  firstName?: string | null;
  lastName?: string | null;
  organisationName?: string | null;
  titlePrefix?: string | null;
  titleSuffix?: string | null;
  street?: string | null;
  addon?: string | null;
  zip?: string | null;
  place?: string | null;
  balance?: number;
  interest?: number;
  deposits?: number;
  withdrawals?: number;
  interestPaid?: number;
  interestError?: number;
  notReclaimed?: number;
  amount?: number;
  interestRate?: number;
  balanceInterestRate?: number;
  totalLoans?: number;
  activeLoans?: number;
  loans?: TemplateLoanRecord[];
  notes?: TemplateNoteRecord[];
};

function formatNote(note: TemplateNoteRecord, locale: string) {
  const createdByName = note.createdBy?.name ?? '';

  return {
    note: {
      ...note,
      createdAt: formatDate(note.createdAt, locale),
      createdByName,
      createdBy: {
        name: createdByName,
      },
    },
  };
}

function formatTransaction(transaction: TemplateTransactionRecord, locale: string) {
  return {
    transaction: {
      ...transaction,
      amount: formatCurrency(transaction.amount, locale),
      date: formatDate(transaction.date, locale),
    },
  };
}

function formatLoanFields(loan: TemplateLoanRecord, locale: string) {
  return {
    ...loan,
    amount: formatCurrency(loan.amount, locale),
    interestRate: formatPercentage(loan.interestRate, locale),
    signDate: formatDate(loan.signDate, locale),
    endDate: formatDate(loan.endDate, locale),
    terminationDate: formatDate(loan.terminationDate, locale),
    contractStatus: loan.contractStatus === 'COMPLETED' ? 'Abgeschlossen' : 'Laufend',
    balance: formatCurrency(loan.balance, locale),
    interest: formatCurrency(loan.interest, locale),
    deposits: formatCurrency(loan.deposits, locale),
    withdrawals: formatCurrency(loan.withdrawals, locale),
    interestPaid: formatCurrency(loan.interestPaid, locale),
    interestError: formatCurrency(loan.interestError, locale),
    notReclaimed: formatCurrency(loan.notReclaimed, locale),
    repaidDate: loan.repaidDate ? formatDate(loan.repaidDate, locale) : '',
    repayDate: loan.repayDate ? formatDate(loan.repayDate, locale) : '',
    isTerminated: loan.isTerminated ? 'Ja' : 'Nein',
  };
}

function formatLenderFields(lender: TemplateLenderRecord, locale: string) {
  return {
    ...lender,
    fullName: getLenderName(lender),
    type: lender.type === 'PERSON' ? 'Person' : 'Organisation',
    salutation: lender.salutation === 'FORMAL' ? 'Formell' : 'Persönlich',
    salutationText:
      lender.salutation === 'FORMAL'
        ? `Sehr geehrte(r) ${lender.firstName ?? ''} ${lender.lastName ?? ''}`.trim()
        : `Liebe(r) ${lender.firstName ?? ''}`.trim(),
    fullAddress: [lender.street, lender.addon, `${lender.zip ?? ''} ${lender.place ?? ''}`.trim()]
      .filter(Boolean)
      .join(', '),
    balance: formatCurrency(lender.balance ?? 0, locale),
    interest: formatCurrency(lender.interest ?? 0, locale),
    deposits: formatCurrency(lender.deposits ?? 0, locale),
    withdrawals: formatCurrency(lender.withdrawals ?? 0, locale),
    interestPaid: formatCurrency(lender.interestPaid ?? 0, locale),
    interestError: formatCurrency(lender.interestError ?? 0, locale),
    notReclaimed: formatCurrency(lender.notReclaimed ?? 0, locale),
    amount: formatCurrency(lender.amount ?? 0, locale),
    interestRate: formatPercentage(lender.interestRate ?? 0, locale),
    balanceInterestRate: formatPercentage(lender.balanceInterestRate ?? 0, locale),
    totalLoans: String(lender.totalLoans ?? 0),
    activeLoans: String(lender.activeLoans ?? 0),
  };
}

function buildLenderTemplateData(lender: TemplateLenderRecord, locale: string) {
  return {
    lender: formatLenderFields(lender, locale),
    loans: (lender.loans ?? []).map((loan: TemplateLoanRecord) => ({
      loan: formatLoanFields(loan, locale),
      transactions: Array.isArray(loan.transactions)
        ? loan.transactions.map((transaction: TemplateTransactionRecord) => formatTransaction(transaction, locale))
        : [],
      notes: Array.isArray(loan.notes) ? loan.notes.map((note: TemplateNoteRecord) => formatNote(note, locale)) : [],
    })),
    notes: (lender.notes ?? []).map((note: TemplateNoteRecord) => formatNote(note, locale)),
  };
}

/** Synthetic interest rows from `calculateLoanFields` must not be passed to `calculateLoanPerYear`. */
function stripSyntheticInterestTransactions(loan: TemplateLoanRecord): TemplateLoanRecord {
  return {
    ...loan,
    transactions: (loan.transactions ?? []).filter((t) => (t as { type?: string }).type !== TransactionType.INTEREST),
  };
}

function loanForPerYearCalc(loan: TemplateLoanRecord, lender: TemplateLenderRecord): LoanWithRelations {
  const stripped = stripSyntheticInterestTransactions(loan);
  const withLender = {
    ...stripped,
    lender: parseAdditionalFields(lender as unknown as LenderWithRelations),
  };
  return parseAdditionalFields(withLender as { additionalFields?: unknown }) as unknown as LoanWithRelations;
}

type YearlyRow = {
  year: number;
  begin: Prisma.Decimal;
  end: Prisma.Decimal;
  withdrawals: Prisma.Decimal;
  deposits: Prisma.Decimal;
  notReclaimed: Prisma.Decimal;
  interestPaid: Prisma.Decimal;
  interest: Prisma.Decimal;
  interestError: Prisma.Decimal;
};

function formatYearlyScopeFields(
  year: number,
  row: YearlyRow | null | undefined,
  locale: string,
): Record<string, string> {
  const z = (d: Prisma.Decimal | number) => formatCurrency(typeof d === 'number' ? d : d.toNumber(), locale);
  if (!row) {
    return {
      year: String(year),
      begin: z(0),
      end: z(0),
      deposits: z(0),
      withdrawals: z(0),
      interest: z(0),
      interestPaid: z(0),
      notReclaimed: z(0),
      interestError: z(0),
    };
  }
  return {
    year: String(year),
    begin: z(row.begin),
    end: z(row.end),
    deposits: z(row.deposits),
    withdrawals: z(row.withdrawals),
    interest: z(row.interest),
    interestPaid: z(row.interestPaid),
    notReclaimed: z(row.notReclaimed),
    interestError: z(row.interestError),
  };
}

function buildLenderYearlyTemplateData(lender: TemplateLenderRecord, year: number, locale: string) {
  const toDate = new Date(year, 11, 31);

  const agg = {
    begin: 0,
    end: 0,
    deposits: 0,
    withdrawals: 0,
    interest: 0,
    interestPaid: 0,
    notReclaimed: 0,
    interestError: 0,
  };

  const loans = (lender.loans ?? []).map((loan: TemplateLoanRecord) => {
    let yearRow: YearlyRow | undefined;
    try {
      const perYear = calculateLoanPerYear(loanForPerYearCalc(loan, lender), toDate);
      yearRow = perYear.find((e) => e.year === year) as YearlyRow | undefined;
      if (yearRow) {
        agg.begin += yearRow.begin.toNumber();
        agg.end += yearRow.end.toNumber();
        agg.deposits += yearRow.deposits.toNumber();
        agg.withdrawals += yearRow.withdrawals.toNumber();
        agg.interest += yearRow.interest.toNumber();
        agg.interestPaid += yearRow.interestPaid.toNumber();
        agg.notReclaimed += yearRow.notReclaimed.toNumber();
        agg.interestError += yearRow.interestError.toNumber();
      }
    } catch {
      // keep zeros for this loan
    }

    const transactionsYearlyRaw = [...(loan.transactions ?? [])]
      .filter((t) => new Date(t.date as Date | string).getFullYear() === year)
      .sort((a, b) => transactionSorter(a as Transaction, b as Transaction));

    return {
      loan: formatLoanFields(loan, locale),
      loanYearly: formatYearlyScopeFields(year, yearRow, locale),
      transactions: Array.isArray(loan.transactions)
        ? loan.transactions.map((transaction: TemplateTransactionRecord) => formatTransaction(transaction, locale))
        : [],
      transactionsYearly: transactionsYearlyRaw.map((transaction: TemplateTransactionRecord) =>
        formatTransaction(transaction, locale),
      ),
      notes: Array.isArray(loan.notes) ? loan.notes.map((note: TemplateNoteRecord) => formatNote(note, locale)) : [],
    };
  });

  const lenderYearly = {
    ...formatYearlyScopeFields(
      year,
      {
        year,
        begin: new Prisma.Decimal(agg.begin),
        end: new Prisma.Decimal(agg.end),
        withdrawals: new Prisma.Decimal(agg.withdrawals),
        deposits: new Prisma.Decimal(agg.deposits),
        notReclaimed: new Prisma.Decimal(agg.notReclaimed),
        interestPaid: new Prisma.Decimal(agg.interestPaid),
        interest: new Prisma.Decimal(agg.interest),
        interestError: new Prisma.Decimal(agg.interestError),
      },
      locale,
    ),
  };

  return {
    lender: formatLenderFields(lender, locale),
    lenderYearly,
    loans,
    notes: (lender.notes ?? []).map((note: TemplateNoteRecord) => formatNote(note, locale)),
  };
}

async function getProjectTemplateData(projectId: string, locale: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      slug: true,
      configuration: {
        select: {
          name: true,
        },
      },
      lenders: {
        include: lenderTemplateInclude,
      },
    },
  });

  if (!project) return null;

  const config = await getConfigData(project.id);
  const lenders = project.lenders.map((lender) =>
    calculateLenderFields(
      parseAdditionalFields({
        ...lender,
        loans: lender.loans.map((loan) => parseAdditionalFields(loan)),
      }),
    ),
  );

  return {
    platform: getPlatformData(),
    config,
    project: {
      name: project.configuration?.name ?? '',
      slug: project.slug,
    },
    lenders: lenders.map((lender) => buildLenderTemplateData(lender, locale)),
  };
}

export async function getTemplateData(
  dataset: TemplateDataset,
  recordId?: string | null,
  locale = 'de',
  projectId?: string,
  options?: TemplateDataOptions,
): Promise<Record<string, unknown> | null> {
  if (dataset === 'LENDER') {
    if (!recordId) return null;

    const lender = await getCalculatedLender(recordId);
    if (!lender) return null;

    const resolvedProjectId = projectId || lender.project?.id;
    const config = resolvedProjectId ? await getConfigData(resolvedProjectId) : {};

    return {
      platform: getPlatformData(),
      config,
      ...buildLenderTemplateData(lender, locale),
    };
  }

  if (dataset === 'LOAN') {
    if (!recordId) return null;

    const loan = await getCalculatedLoan(recordId);
    if (!loan) return null;

    const resolvedProjectId = projectId || loan.lender.project?.id;
    const config = resolvedProjectId ? await getConfigData(resolvedProjectId) : {};
    const sortedTransactions = [...(loan.transactions ?? [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sortedTransactions[0];

    return {
      platform: getPlatformData(),
      config,
      lender: formatLenderFields(loan.lender, locale),
      loan: formatLoanFields(loan, locale),
      latestTransaction: latest
        ? {
            type: latest.type,
            amount: formatCurrency(latest.amount, locale),
            date: formatDate(latest.date, locale),
            paymentType: latest.paymentType,
          }
        : { type: '', amount: '', date: '', paymentType: '' },
      transactions: (loan.transactions ?? []).map((transaction) => formatTransaction(transaction, locale)),
      notes: (loan.notes ?? []).map((note) => formatNote(note, locale)),
    };
  }

  if (dataset === 'USER') {
    if (!recordId) return null;

    const user = await db.user.findUnique({
      where: { id: recordId },
      select: { name: true, email: true },
    });
    if (!user) return null;

    return {
      platform: getPlatformData(),
      user: {
        name: user.name ?? '',
        email: user.email ?? '',
      },
    };
  }

  if (dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY') {
    const resolvedProjectId = recordId ?? projectId;
    if (!resolvedProjectId) return null;

    return getProjectTemplateData(resolvedProjectId, locale);
  }

  if (dataset === 'LENDER_YEARLY') {
    if (!recordId) return null;

    const lender = await getCalculatedLender(recordId);
    if (!lender) return null;

    const resolvedProjectId = projectId || lender.project?.id;
    const config = resolvedProjectId ? await getConfigData(resolvedProjectId) : {};

    const lastCompleteYear = new Date().getFullYear() - 1;
    const requestedYear = options?.year ?? lastCompleteYear;
    if (requestedYear > lastCompleteYear) return null;

    return {
      platform: getPlatformData(),
      config,
      ...buildLenderYearlyTemplateData(lender, requestedYear, locale),
    };
  }

  return null;
}
