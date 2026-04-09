'use server';

import type { TemplateDataset } from '@prisma/client';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTemplateData, type TemplateDataOptions } from '@/lib/templates/template-data';

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
export async function getSampleLenderYearsAction(lenderId: string): Promise<number[]> {
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
}
