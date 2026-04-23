'use server';

import type { Prisma, TemplateDataset } from '@prisma/client';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lenderIdSchema, projectSampleListSchema } from '@/lib/schemas/common';
import { getTemplateData, type TemplateDataOptions } from '@/lib/templates/template-data';
import { lenderAction, projectAction } from '@/lib/utils/safe-action';

/**
 * All projects (id + display name) for global template preview sample data.
 * Admin-only; used when a global template has no `projectId` and the editor has no project from the route.
 */
export async function getProjectsForTemplateSampleAction(): Promise<Array<{ id: string; name: string }>> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return [];
  }
  const projects = await db.project.findMany({
    select: {
      id: true,
      configuration: {
        select: { name: true },
      },
    },
    orderBy: {
      configuration: {
        name: 'asc',
      },
    },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.configuration?.name?.trim() ? p.configuration.name : p.id,
  }));
}

const sampleLenderSelect = {
  id: true,
  lenderNumber: true,
  firstName: true,
  lastName: true,
  organisationName: true,
  type: true,
  email: true,
} as const;

const sampleLoanSelect = {
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
} as const;

const sampleTransactionSelect = {
  id: true,
  type: true,
  amount: true,
  date: true,
  loan: {
    select: {
      loanNumber: true,
      lender: {
        select: {
          firstName: true,
          lastName: true,
          organisationName: true,
          type: true,
        },
      },
    },
  },
} as const;

export type SampleLenderRow = Prisma.LenderGetPayload<{ select: typeof sampleLenderSelect }>;
export type SampleLoanRow = Prisma.LoanGetPayload<{ select: typeof sampleLoanSelect }>;
export type SampleTransactionRow = Prisma.TransactionGetPayload<{ select: typeof sampleTransactionSelect }>;

async function fetchSampleLendersForProject(projectId: string, take: number) {
  return db.lender.findMany({
    where: { projectId },
    select: sampleLenderSelect,
    orderBy: { lenderNumber: 'asc' },
    take,
  });
}

async function fetchSampleLoansForProject(projectId: string, take: number) {
  return db.loan.findMany({
    where: { lender: { projectId } },
    select: sampleLoanSelect,
    orderBy: { loanNumber: 'asc' },
    take,
  });
}

async function fetchSampleTransactionsForProject(projectId: string, take: number) {
  return db.transaction.findMany({
    where: { loan: { lender: { projectId } } },
    select: sampleTransactionSelect,
    orderBy: { date: 'desc' },
    take,
  });
}

/**
 * Get sample lenders for preview selection (simplified view)
 */
export const getSampleLendersAction = projectAction.inputSchema(projectSampleListSchema).action(async ({ parsedInput }) => {
  const { projectId, limit = 10 } = parsedInput;
  return fetchSampleLendersForProject(projectId, limit);
});

/**
 * Get sample loans for preview selection (simplified view)
 */
export const getSampleLoansAction = projectAction.inputSchema(projectSampleListSchema).action(async ({ parsedInput }) => {
  const { projectId, limit = 10 } = parsedInput;
  return fetchSampleLoansForProject(projectId, limit);
});

/**
 * Sample transactions for `TRANSACTION` dataset template preview (merge data uses transaction id).
 */
export const getSampleTransactionsAction = projectAction.inputSchema(projectSampleListSchema).action(async ({ parsedInput }) => {
  const { projectId, limit = 20 } = parsedInput;
  return fetchSampleTransactionsForProject(projectId, limit);
});

/**
 * Get template data for preview replacement and live rendering.
 */
export async function getMergeTagValuesAction(
  dataset: TemplateDataset,
  recordId?: string | null,
  locale = 'de',
  projectId?: string,
  options?: TemplateDataOptions,
): Promise<Record<string, unknown> | null> {
  return getTemplateData(dataset, recordId, locale, projectId, options);
}

/**
 * Years available for `LENDER_YEARLY` sample data: from first lender transaction through last complete calendar year.
 */
export const getSampleLenderYearsAction = lenderAction
  .schema(lenderIdSchema)
  .action(async ({ parsedInput: { lenderId } }) => {
    const lastCompleteYear = new Date().getFullYear() - 1;
    const agg = await db.transaction.aggregate({
      where: { loan: { lenderId } },
      _min: { date: true },
    });
    const minDate = agg._min.date;
    if (!minDate) return [];
    const firstYear = new Date(minDate).getFullYear();
    const years: number[] = [];
    for (let y = firstYear; y <= lastCompleteYear; y++) {
      years.push(y);
    }
    return years.reverse();
  });
