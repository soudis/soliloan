'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { updateTemplateSchema } from '@/lib/schemas/templates';
import { templateAction } from '@/lib/utils/safe-action';

export const updateTemplateAction = templateAction
  .inputSchema(updateTemplateSchema)
  .action(async ({ parsedInput: data }) => {
    const template = await db.communicationTemplate.update({
      where: { id: data.templateId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.designJson !== undefined && { designJson: data.designJson }),
        ...(data.htmlContent !== undefined && { htmlContent: data.htmlContent }),
      },
      select: {
        id: true,
        projectId: true,
        isGlobal: true,
      },
    });

    if (template.isGlobal) {
      revalidatePath('/admin/templates');
    } else if (template.projectId) {
      revalidatePath(`/${template.projectId}/configuration`);
    }

    return { id: template.id };
  });
