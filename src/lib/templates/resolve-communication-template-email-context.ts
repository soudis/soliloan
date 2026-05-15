import type { TemplateDataset } from '@prisma/client';

import { db } from '@/lib/db';
import { getLenderEmailFromTemplateMergeData } from '@/lib/email';
import type { SendCommunicationTemplateEmailFormData } from '@/lib/schemas/templates';
import { buildTemplateUseSearchParams, parseTemplateDownloadQuery } from '@/lib/templates/template-download-query';
import { getTemplateData } from '@/lib/templates/template-data';
import { assertManagerCanUseCommunicationTemplate } from '@/lib/templates/template-use-access';

export type CommunicationTemplateEmailResolved = {
  designJson: unknown;
  subjectOrFilename: string | null;
  mergeData: Record<string, unknown>;
  to: string;
  fallbackSubject: string;
  logoUrl: string | null;
};

function assertQuickActionPayload<
  T extends { lenderId?: string; loanId?: string; transactionId?: string; year?: number },
>(dataset: TemplateDataset, data: T) {
  switch (dataset) {
    case 'LENDER':
      if (!data.lenderId) {
        throw new Error('error.template.quickActionMissingContext');
      }
      return;
    case 'LENDER_YEARLY':
      if (!data.lenderId || data.year == null) {
        throw new Error('error.template.quickActionMissingContext');
      }
      return;
    case 'LOAN':
      if (!data.loanId) {
        throw new Error('error.template.quickActionMissingContext');
      }
      return;
    case 'TRANSACTION':
      if (!data.transactionId) {
        throw new Error('error.template.quickActionMissingContext');
      }
      return;
    default:
      throw new Error('error.template.notFound');
  }
}

/**
 * Loads template data, checks access, and resolves recipient — shared by send and preview actions.
 */
export async function resolveCommunicationTemplateEmailContext(
  data: SendCommunicationTemplateEmailFormData,
  userId: string,
  isAdmin: boolean,
): Promise<CommunicationTemplateEmailResolved> {
  const template = await db.communicationTemplate.findUnique({
    where: { id: data.templateId },
  });

  if (!template || template.type !== 'EMAIL') {
    throw new Error('error.template.notFound');
  }

  assertQuickActionPayload(template.dataset, data);

  const sp = buildTemplateUseSearchParams(template.dataset, {
    projectId: data.projectId,
    lenderId: data.lenderId,
    loanId: data.loanId,
    transactionId: data.transactionId,
    year: data.year,
  });

  const parsed = parseTemplateDownloadQuery(template.dataset, sp);
  if (!parsed.ok) {
    throw new Error('error.template.quickActionMissingContext');
  }

  const canUse = await assertManagerCanUseCommunicationTemplate({
    userId,
    isAdmin,
    template: { projectId: template.projectId, isGlobal: template.isGlobal },
    dataset: template.dataset,
    parsed,
  });
  if (!canUse) {
    throw new Error('error.template.notFound');
  }

  const locale = 'de';
  const templateData = await getTemplateData(
    template.dataset,
    parsed.recordId,
    locale,
    parsed.projectId ?? template.projectId ?? undefined,
    parsed.options,
  );

  if (!templateData) {
    throw new Error('error.template.notFound');
  }

  const mergeData = templateData as Record<string, unknown>;

  let logoUrl: string | null = null;
  const configLogo = (mergeData.config as { logo?: unknown } | undefined)?.logo;
  if (typeof configLogo === 'string' && configLogo.length > 0) {
    logoUrl = configLogo;
  } else if (parsed.projectId || template.projectId) {
    const pid = parsed.projectId ?? template.projectId;
    if (pid) {
      const project = await db.project.findUnique({
        where: { id: pid },
        select: { configuration: { select: { logo: true } } },
      });
      logoUrl = project?.configuration?.logo ?? null;
    }
  }

  const to = getLenderEmailFromTemplateMergeData(mergeData);
  if (!to) {
    throw new Error('error.lender.noEmailForTemplate');
  }

  return {
    designJson: template.designJson,
    subjectOrFilename: template.subjectOrFilename,
    mergeData,
    to,
    fallbackSubject: template.name,
    logoUrl,
  };
}
