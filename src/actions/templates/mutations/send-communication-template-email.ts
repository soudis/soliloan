'use server';

import { db } from '@/lib/db';
import {
  getLenderEmailFromTemplateMergeData,
  renderAndSendCommunicationTemplateEmail,
} from '@/lib/email';
import { buildTemplateUseSearchParams, parseTemplateDownloadQuery } from '@/lib/templates/template-download-query';
import { getTemplateData } from '@/lib/templates/template-data';
import { assertManagerCanUseCommunicationTemplate } from '@/lib/templates/template-use-access';
import { sendCommunicationTemplateEmailSchema } from '@/lib/schemas/templates';
import { managerAction } from '@/lib/utils/safe-action';

function assertQuickActionPayload<T extends { lenderId?: string; loanId?: string; transactionId?: string; year?: number }>(
  dataset: import('@prisma/client').TemplateDataset,
  data: T,
) {
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

export const sendCommunicationTemplateEmailAction = managerAction
  .inputSchema(sendCommunicationTemplateEmailSchema)
  .action(async ({ parsedInput: data, ctx }) => {
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

    const userId = ctx.session.user.id as string;
    const isAdmin = Boolean(ctx.session.user.isAdmin);

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

    const ok = await renderAndSendCommunicationTemplateEmail({
      designJson: template.designJson,
      subjectOrFilename: template.subjectOrFilename,
      mergeData,
      to,
      fallbackSubject: template.name,
      logoUrl,
    });

    if (!ok) {
      throw new Error('error.template.notFound');
    }

    return { sent: true as const };
  });
