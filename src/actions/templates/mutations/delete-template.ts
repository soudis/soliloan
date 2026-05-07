'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { deleteTemplateSchema } from '@/lib/schemas/templates';
import { templateAction } from '@/lib/utils/safe-action';

export const deleteTemplateAction = templateAction
  .inputSchema(deleteTemplateSchema)
  .action(async ({ parsedInput: data }) => {
    const existing = await db.communicationTemplate.findUnique({
      where: { id: data.templateId },
      select: { isSystem: true, projectId: true },
    });

    if (existing?.isSystem && !existing.projectId) {
      throw new Error('error.template.systemCannotDelete');
    }

    const template = await db.communicationTemplate.delete({
      where: { id: data.templateId },
      select: {
        id: true,
        projectId: true,
        isGlobal: true,
      },
    });

    if (template.isGlobal) {
      revalidatePath('/admin/templates');
    } else if (template.projectId) {
      revalidatePath('/configuration');
    }

    return { success: true };
  });
