'use server';

import type { TemplateDataset } from '@prisma/client';

import { db } from '@/lib/db';
import { getTemplateData } from '@/lib/templates/template-data';

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
): Promise<Record<string, unknown> | null> {
  return getTemplateData(dataset, recordId, locale, projectId);
}
