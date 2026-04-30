'use server';

import type { Prisma, TemplateDataset } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { lenderIdSchema, projectSampleListSchema } from '@/lib/schemas/common';
import { getMergeTagValuesInputSchema } from '@/lib/schemas/templates';
import { getTemplateData, type TemplateDataOptions } from '@/lib/templates/template-data';
import { adminAction, lenderAction, managerAction, projectAction } from '@/lib/utils/safe-action';

/**
 * All projects (id + display name) for global template preview sample data.
 * Admin-only; used when a global template has no `projectId` and the editor has no project from the route.
 */
export const getProjectsForTemplateSampleAction = adminAction
  .inputSchema(z.object({}))
  .action(async () => {
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
  });

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
 * Enforces that the manager may load merge data for the given dataset/ids (admins: full access).
 */
async function assertCanAccessMergeTagData(
  user: { id?: string | null; isAdmin?: boolean | null },
  input: { dataset: TemplateDataset; recordId?: string | null; projectId?: string },
) {
  if (user.isAdmin) {
    return;
  }

  const userId = user.id;
  if (!userId) {
    throw new Error('error.unauthorized');
  }
  const { dataset, recordId, projectId: routeProjectId } = input;

  const assertUserManagesProject = async (entityProjectId: string) => {
    const n = await db.project.count({
      where: { id: entityProjectId, managers: { some: { id: userId } } },
    });
    if (n === 0) {
      throw new Error('error.project.notFound');
    }
  };

  switch (dataset) {
    case 'LENDER':
    case 'LENDER_YEARLY': {
      if (!recordId) {
        return;
      }
      const lender = await db.lender.findUnique({
        where: { id: recordId },
        select: { projectId: true },
      });
      if (!lender) {
        throw new Error('error.lender.notFound');
      }
      if (routeProjectId && routeProjectId !== lender.projectId) {
        throw new Error('error.unauthorized');
      }
      await assertUserManagesProject(lender.projectId);
      return;
    }
    case 'LOAN': {
      if (!recordId) {
        return;
      }
      const loan = await db.loan.findUnique({
        where: { id: recordId },
        select: { lender: { select: { projectId: true } } },
      });
      if (!loan) {
        throw new Error('error.loan.notFound');
      }
      if (routeProjectId && routeProjectId !== loan.lender.projectId) {
        throw new Error('error.unauthorized');
      }
      await assertUserManagesProject(loan.lender.projectId);
      return;
    }
    case 'TRANSACTION': {
      if (!recordId) {
        return;
      }
      const transaction = await db.transaction.findUnique({
        where: { id: recordId },
        select: { loan: { select: { lender: { select: { projectId: true } } } } },
      });
      if (!transaction) {
        throw new Error('error.transaction.notFound');
      }
      const entityProjectId = transaction.loan.lender.projectId;
      if (routeProjectId && routeProjectId !== entityProjectId) {
        throw new Error('error.unauthorized');
      }
      await assertUserManagesProject(entityProjectId);
      return;
    }
    case 'USER': {
      if (recordId && recordId !== userId) {
        throw new Error('error.unauthorized');
      }
      return;
    }
    case 'PROJECT':
    case 'PROJECT_YEARLY': {
      const resolved = recordId ?? routeProjectId;
      if (!resolved) {
        return;
      }
      if (recordId && routeProjectId && recordId !== routeProjectId) {
        throw new Error('error.unauthorized');
      }
      await assertUserManagesProject(resolved);
      return;
    }
    default: {
      return;
    }
  }
}

/**
 * Get template data for preview replacement and live rendering.
 */
export const getMergeTagValuesAction = managerAction.inputSchema(getMergeTagValuesInputSchema).action(
  async ({ ctx, parsedInput }) => {
    const { dataset, recordId, locale, projectId, year } = parsedInput;
    await assertCanAccessMergeTagData(ctx.session.user, { dataset, recordId, projectId });
    const options: TemplateDataOptions | undefined = year != null && Number.isFinite(year) ? { year } : undefined;
    return getTemplateData(dataset, recordId, locale, projectId, options);
  },
);

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
