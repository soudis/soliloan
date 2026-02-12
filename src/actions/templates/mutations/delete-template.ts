'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { deleteTemplateSchema } from '@/lib/schemas/templates';
import { templateAction } from '@/lib/utils/safe-action';

export const deleteTemplateAction = templateAction
  .inputSchema(deleteTemplateSchema)
  .action(async ({ parsedInput: data }) => {
    const template = await db.communicationTemplate.delete({
      where: { id: data.id },
      select: {
        id: true,
        projectId: true,
        isGlobal: true,
      },
    });

    if (template.isGlobal) {
      revalidatePath('/admin/templates');
    } else {
      revalidatePath('/configuration');
    }

    return { success: true };
  });
