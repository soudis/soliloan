import type { TemplateDataset, TemplateType } from '@prisma/client';

import { db } from '@/lib/db';
import type { TemplateDownloadParseResult } from '@/lib/templates/template-download-query';

type TemplateAccessRow = {
  projectId: string | null;
  isGlobal: boolean;
};

/**
 * Resolves the project id that scopes manager access for using a communication template
 * with a concrete record (lender / loan / transaction / project / user).
 */
export async function resolveContextProjectIdForTemplateUse(
  dataset: TemplateDataset,
  parsed: Extract<TemplateDownloadParseResult, { ok: true }>,
): Promise<string | null> {
  switch (dataset) {
    case 'LENDER':
    case 'LENDER_YEARLY': {
      const lender = await db.lender.findUnique({
        where: { id: parsed.recordId },
        select: { projectId: true },
      });
      return lender?.projectId ?? null;
    }
    case 'LOAN': {
      const loan = await db.loan.findUnique({
        where: { id: parsed.recordId },
        select: { lender: { select: { projectId: true } } },
      });
      return loan?.lender.projectId ?? null;
    }
    case 'TRANSACTION': {
      const tx = await db.transaction.findUnique({
        where: { id: parsed.recordId },
        select: {
          loan: { select: { lender: { select: { projectId: true } } } },
        },
      });
      return tx?.loan.lender.projectId ?? null;
    }
    case 'PROJECT':
    case 'PROJECT_YEARLY':
      return parsed.recordId;
    default:
      return null;
  }
}

/**
 * Whether the user may render/download/send this template for the given parsed query
 * (manager must manage the data's project for global templates; project templates use template.projectId).
 */
export async function assertManagerCanUseCommunicationTemplate(params: {
  userId: string;
  isAdmin: boolean;
  template: TemplateAccessRow;
  dataset: TemplateDataset;
  parsed: Extract<TemplateDownloadParseResult, { ok: true }>;
}): Promise<boolean> {
  const { userId, isAdmin, template, dataset, parsed } = params;

  if (isAdmin) {
    return true;
  }

  if (template.projectId) {
    const count = await db.project.count({
      where: { id: template.projectId, managers: { some: { id: userId } } },
    });
    return count > 0;
  }

  if (template.isGlobal) {
    const contextProjectId = await resolveContextProjectIdForTemplateUse(dataset, parsed);
    if (!contextProjectId) {
      return false;
    }
    if (parsed.projectId && parsed.projectId !== contextProjectId) {
      return false;
    }
    const count = await db.project.count({
      where: { id: contextProjectId, managers: { some: { id: userId } } },
    });
    return count > 0;
  }

  return true;
}

/** Lenders may download public DOCUMENT templates for their own loan / lender yearly data only. */
export async function assertLenderCanUsePublicCommunicationTemplate(params: {
  userEmail: string | null | undefined;
  template: TemplateAccessRow & { type: TemplateType; isPublic: boolean };
  dataset: TemplateDataset;
  parsed: Extract<TemplateDownloadParseResult, { ok: true }>;
}): Promise<boolean> {
  const { userEmail, template, dataset, parsed } = params;

  if (!userEmail || template.type !== 'DOCUMENT' || !template.isPublic) {
    return false;
  }

  if (dataset !== 'LOAN' && dataset !== 'LENDER_YEARLY') {
    return false;
  }

  if (dataset === 'LOAN') {
    const loan = await db.loan.findUnique({
      where: { id: parsed.recordId },
      select: {
        lender: { select: { email: true, projectId: true } },
      },
    });
    if (!loan || loan.lender.email !== userEmail) {
      return false;
    }
    if (parsed.projectId && parsed.projectId !== loan.lender.projectId) {
      return false;
    }
    if (template.projectId && template.projectId !== loan.lender.projectId) {
      return false;
    }
    return true;
  }

  const lender = await db.lender.findUnique({
    where: { id: parsed.recordId },
    select: { email: true, projectId: true },
  });
  if (!lender || lender.email !== userEmail) {
    return false;
  }
  if (parsed.projectId && parsed.projectId !== lender.projectId) {
    return false;
  }
  if (template.projectId && template.projectId !== lender.projectId) {
    return false;
  }
  return true;
}
