'use server';

import type { TemplateDataset } from '@prisma/client';

import { getLenderAction } from '@/actions/lenders/queries/get-lender';
import { getLoanAction } from '@/actions/loans/queries/get-loan';
import { db } from '@/lib/db';
import { formatCurrency, formatDate, formatPercentage, getLenderName } from '@/lib/utils';

/**
 * Get sample lenders for preview selection (simplified view)
 */
export async function getSampleLendersAction(projectId: string, limit = 10) {
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
 * Get sample loans for preview selection (simplified view)
 */
export async function getSampleLoansAction(projectId: string, limit = 10) {
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
 * Fetch project configuration and build the config merge tag data.
 */
async function getConfigData(projectId: string): Promise<Record<string, string>> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      configuration: {
        select: {
          name: true,
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

  const c = project?.configuration;
  if (!c) return {};

  return {
    name: c.name ?? '',
    email: c.email ?? '',
    telNo: c.telNo ?? '',
    website: c.website ?? '',
    street: c.street ?? '',
    addon: c.addon ?? '',
    zip: c.zip ?? '',
    place: c.place ?? '',
    country: c.country ?? '',
    fullAddress: [c.street, c.addon, `${c.zip ?? ''} ${c.place ?? ''}`.trim()].filter(Boolean).join(', '),
    iban: c.iban ?? '',
    bic: c.bic ?? '',
  };
}

/**
 * Get merge tag values for preview replacement
 * Uses the same calculations as the actual data fetching to ensure consistency
 */
export async function getMergeTagValuesAction(
  dataset: TemplateDataset,
  recordId: string,
  locale = 'de',
  projectId?: string,
): Promise<Record<string, unknown> | null> {
  if (dataset === 'LENDER') {
    const result = await getLenderAction({ lenderId: recordId });

    if (!result?.data || 'error' in result.data) return null;

    const lender = result.data.lender;

    // Resolve projectId for config lookup
    const resolvedProjectId = projectId || lender.project?.id;
    const config = resolvedProjectId ? await getConfigData(resolvedProjectId) : {};

    // Format all fields for easy access
    const formattedResult = {
      config,
      lender: {
        ...lender,
        lenderNumber: String(lender.lenderNumber),
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
        balance: formatCurrency(lender.balance, locale),
        interest: formatCurrency(lender.interest, locale),
        deposits: formatCurrency(lender.deposits, locale),
        withdrawals: formatCurrency(lender.withdrawals, locale),
        interestPaid: formatCurrency(lender.interestPaid, locale),
        interestError: formatCurrency(lender.interestError, locale),
        notReclaimed: formatCurrency(lender.notReclaimed, locale),
        amount: formatCurrency(lender.amount, locale),
        interestRate: formatPercentage(lender.interestRate, locale),
        balanceInterestRate: formatPercentage(lender.balanceInterestRate, locale),
        totalLoans: String(lender.totalLoans),
        activeLoans: String(lender.activeLoans),
      },
      loans: (lender.loans || []).map((loan) => ({
        loan: {
          ...loan,
          loanNumber: String(loan.loanNumber),
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
          transactions: (loan.transactions || []).map((t) => ({
            transaction: {
              ...t,
              amount: formatCurrency(t.amount, locale),
              date: formatDate(t.date, locale),
            },
          })),
          notes: (loan.notes || []).map((n) => ({
            note: {
              ...n,
              createdAt: formatDate(n.createdAt, locale),
              'createdBy.name': n.createdBy?.name || '',
            },
          })),
        },
      })),
      notes: (lender.notes || []).map((n) => ({
        note: {
          ...n,
          createdAt: formatDate(n.createdAt, locale),
          'createdBy.name': n.createdBy?.name || '',
        },
      })),
    };

    return formattedResult;
  }

  if (dataset === 'LOAN') {
    const result = await getLoanAction({ loanId: recordId });

    if (!result?.data || 'error' in result.data) return null;

    const loan = result.data.loan;
    const lender = loan.lender;

    // Resolve projectId for config lookup
    const resolvedProjectId = projectId || lender.project?.id;
    const config = resolvedProjectId ? await getConfigData(resolvedProjectId) : {};

    return {
      config,
      lender: {
        ...lender,
        lenderNumber: String(lender.lenderNumber),
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
      },
      loan: {
        ...loan,
        loanNumber: String(loan.loanNumber),
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
      },
      transactions: (loan.transactions || []).map((t) => ({
        transaction: {
          ...t,
          amount: formatCurrency(t.amount, locale),
          date: formatDate(t.date, locale),
        },
      })),
      notes: (loan.notes || []).map((n) => ({
        note: {
          ...n,
          createdAt: formatDate(n.createdAt, locale),
          'createdBy.name': n.createdBy?.name || '',
        },
      })),
    };
  }

  return null;
}
