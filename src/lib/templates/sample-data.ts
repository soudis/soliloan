// Server-side utilities for template sample data

import { db } from '@/lib/db';
import type { LenderWithRelations } from '@/types/lenders';
import type { LoanWithRelations } from '@/types/loans';
import type { Country, Lender, Loan, Salutation, TemplateDataset } from '@prisma/client';

/**
 * Get sample lenders for preview selection
 */
export async function getSampleLenders(projectId: string, limit = 10) {
  return db.lender.findMany({
    where: { projectId },
    select: {
      id: true,
      lenderNumber: true,
      firstName: true,
      lastName: true,
      organisationName: true,
      type: true,
      email: true,
    },
    orderBy: { lenderNumber: 'asc' },
    take: limit,
  });
}

/**
 * Get sample loans for preview selection
 */
export async function getSampleLoans(projectId: string, limit = 10) {
  return db.loan.findMany({
    where: { lender: { projectId } },
    select: {
      id: true,
      loanNumber: true,
      amount: true,
      signDate: true,
      lender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          organisationName: true,
          type: true,
        },
      },
    },
    orderBy: { loanNumber: 'asc' },
    take: limit,
  });
}

/**
 * Get full lender data for template rendering
 */
export async function getLenderForTemplate(lenderId: string): Promise<LenderWithRelations | null> {
  const lender = await db.lender.findUnique({
    where: { id: lenderId },
    include: {
      notes: {
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
      files: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          public: true,
          description: true,
          thumbnail: true,
          lenderId: true,
          loanId: true,
          createdAt: true,
          createdById: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
      loans: {
        include: {
          transactions: true,
          notes: {
            include: {
              createdBy: { select: { id: true, name: true } },
            },
          },
          files: {
            select: {
              id: true,
              name: true,
              mimeType: true,
              public: true,
              description: true,
              thumbnail: true,
              lenderId: true,
              loanId: true,
              createdAt: true,
              createdById: true,
              createdBy: { select: { id: true, name: true } },
            },
          },
        },
      },
      user: {
        select: { id: true, email: true, name: true, lastLogin: true, lastInvited: true },
      },
      project: {
        include: {
          configuration: {
            select: { interestMethod: true },
          },
        },
      },
    },
  });
  return lender as LenderWithRelations | null;
}

/**
 * Get full loan data for template rendering
 */
export async function getLoanForTemplate(loanId: string): Promise<LoanWithRelations | null> {
  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: {
      lender: {
        include: {
          project: {
            include: {
              configuration: {
                select: { interestMethod: true },
              },
            },
          },
          notes: {
            include: {
              createdBy: { select: { id: true, name: true } },
            },
          },
          files: {
            select: {
              id: true,
              name: true,
              mimeType: true,
              public: true,
              description: true,
              thumbnail: true,
              lenderId: true,
              loanId: true,
              createdAt: true,
              createdById: true,
              createdBy: { select: { id: true, name: true } },
            },
          },
        },
      },
      notes: {
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
      files: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          public: true,
          description: true,
          thumbnail: true,
          lenderId: true,
          loanId: true,
          createdAt: true,
          createdById: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
      transactions: true,
    },
  });
  return loan as LoanWithRelations | null;
}

// Country code to name mapping
const countryNames: Record<Country, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz',
  US: 'USA',
  GB: 'Großbritannien',
  FR: 'Frankreich',
  IT: 'Italien',
  ES: 'Spanien',
  NL: 'Niederlande',
  BE: 'Belgien',
  DK: 'Dänemark',
  SE: 'Schweden',
  NO: 'Norwegen',
  FI: 'Finnland',
  PL: 'Polen',
  CZ: 'Tschechien',
  HU: 'Ungarn',
  RO: 'Rumänien',
  BG: 'Bulgarien',
  HR: 'Kroatien',
  SI: 'Slowenien',
  SK: 'Slowakei',
  EE: 'Estland',
  LV: 'Lettland',
  LT: 'Litauen',
  CY: 'Zypern',
  MT: 'Malta',
  LU: 'Luxemburg',
  IE: 'Irland',
  PT: 'Portugal',
  GR: 'Griechenland',
};

/**
 * Format currency for German locale
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Format date for German locale
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('de-DE').format(new Date(date));
}

/**
 * Format percentage for German locale
 */
function formatPercent(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Get salutation text
 */
function getSalutationText(salutation: Salutation, firstName?: string | null, lastName?: string | null): string {
  if (salutation === 'FORMAL') {
    return `Sehr geehrte(r) ${firstName ?? ''} ${lastName ?? ''}`.trim();
  }
  return `Liebe(r) ${firstName ?? ''}`.trim();
}

/**
 * Generate merge tag values from lender data
 */
export function generateLenderMergeTagValues(lender: Lender): Record<string, unknown> {
  const fullName =
    lender.type === 'PERSON'
      ? `${lender.titlePrefix ?? ''} ${lender.firstName ?? ''} ${lender.lastName ?? ''} ${lender.titleSuffix ?? ''}`.trim()
      : (lender.organisationName ?? '');

  const fullAddress = [lender.street, lender.addon, `${lender.zip ?? ''} ${lender.place ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ');

  return {
    lender: {
      firstName: lender.firstName ?? '',
      lastName: lender.lastName ?? '',
      fullName,
      organisationName: lender.organisationName ?? '',
      email: lender.email ?? '',
      salutationText: getSalutationText(lender.salutation, lender.firstName, lender.lastName),
      lenderNumber: String(lender.lenderNumber),
      telNo: lender.telNo ?? '',
      address: {
        street: lender.street ?? '',
        addon: lender.addon ?? '',
        zip: lender.zip ?? '',
        place: lender.place ?? '',
        country: lender.country ? countryNames[lender.country] : '',
        fullAddress,
      },
      banking: {
        iban: lender.iban ?? '',
        bic: lender.bic ?? '',
      },
    },
  };
}

/**
 * Generate merge tag values from loan data
 */
export function generateLoanMergeTagValues(loan: LoanWithRelations): Record<string, unknown> {
  const lenderValues = generateLenderMergeTagValues(loan.lender);

  // Calculate totals from transactions
  const totalDeposits = loan.transactions.filter((t) => t.type === 'DEPOSIT').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = loan.transactions
    .filter((t) => t.type === 'WITHDRAWAL' || t.type === 'TERMINATION')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalInterest = loan.transactions.filter((t) => t.type === 'INTEREST').reduce((sum, t) => sum + t.amount, 0);

  return {
    ...lenderValues,
    loan: {
      loanNumber: String(loan.loanNumber),
      amount: formatCurrency(loan.amount),
      amountRaw: String(loan.amount),
      interestRate: formatPercent(loan.interestRate),
      interestRateRaw: String(loan.interestRate),
      signDate: formatDate(loan.signDate),
      endDate: formatDate(loan.endDate),
      terminationDate: formatDate(loan.terminationDate),
      contractStatus: loan.contractStatus === 'COMPLETED' ? 'Abgeschlossen' : 'Laufend',
      balance: formatCurrency(totalDeposits - totalWithdrawals + totalInterest),
      accruedInterest: formatCurrency(totalInterest),
      totalDeposits: formatCurrency(totalDeposits),
      totalWithdrawals: formatCurrency(totalWithdrawals),
    },
  };
}

/**
 * Get merge tag values for a given dataset and record ID
 */
export async function getMergeTagValues(
  dataset: TemplateDataset,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  switch (dataset) {
    case 'LENDER': {
      const lender = await getLenderForTemplate(recordId);
      if (!lender) return null;
      return generateLenderMergeTagValues(lender);
    }
    case 'LOAN': {
      const loan = await getLoanForTemplate(recordId);
      if (!loan) return null;
      return generateLoanMergeTagValues(loan);
    }
    case 'PROJECT':
    case 'PROJECT_YEARLY':
      // TODO: Implement project data fetching
      return null;
    default:
      return null;
  }
}
