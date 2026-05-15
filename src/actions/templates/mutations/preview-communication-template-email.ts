'use server';

import { buildCommunicationTemplateEmailContent } from '@/lib/email';
import { sendCommunicationTemplateEmailSchema } from '@/lib/schemas/templates';
import { resolveCommunicationTemplateEmailContext } from '@/lib/templates/resolve-communication-template-email-context';
import { managerAction } from '@/lib/utils/safe-action';

export const previewCommunicationTemplateEmailAction = managerAction
  .inputSchema(sendCommunicationTemplateEmailSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const userId = ctx.session.user.id as string;
    const isAdmin = Boolean(ctx.session.user.isAdmin);

    const resolved = await resolveCommunicationTemplateEmailContext(data, userId, isAdmin);

    const content = buildCommunicationTemplateEmailContent({
      designJson: resolved.designJson,
      subjectOrFilename: resolved.subjectOrFilename,
      mergeData: resolved.mergeData,
      fallbackSubject: resolved.fallbackSubject,
      logoUrl: resolved.logoUrl,
    });

    if (!content) {
      throw new Error('error.template.notFound');
    }

    return {
      to: resolved.to,
      subject: content.subject,
      html: content.html,
    };
  });
