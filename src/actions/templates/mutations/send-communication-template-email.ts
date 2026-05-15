'use server';

import { renderAndSendCommunicationTemplateEmail } from '@/lib/email';
import { sendCommunicationTemplateEmailSchema } from '@/lib/schemas/templates';
import { resolveCommunicationTemplateEmailContext } from '@/lib/templates/resolve-communication-template-email-context';
import { managerAction } from '@/lib/utils/safe-action';

export const sendCommunicationTemplateEmailAction = managerAction
  .inputSchema(sendCommunicationTemplateEmailSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const userId = ctx.session.user.id as string;
    const isAdmin = Boolean(ctx.session.user.isAdmin);

    const resolved = await resolveCommunicationTemplateEmailContext(data, userId, isAdmin);

    const ok = await renderAndSendCommunicationTemplateEmail({
      designJson: resolved.designJson,
      subjectOrFilename: resolved.subjectOrFilename,
      mergeData: resolved.mergeData,
      to: resolved.to,
      fallbackSubject: resolved.fallbackSubject,
      logoUrl: resolved.logoUrl,
    });

    if (!ok) {
      throw new Error('error.template.notFound');
    }

    return { sent: true as const };
  });
