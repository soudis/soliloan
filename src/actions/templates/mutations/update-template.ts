'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { updateTemplateSchema } from '@/lib/schemas/templates';
import { templateAction } from '@/lib/utils/safe-action';

export const updateTemplateAction = templateAction
  .inputSchema(updateTemplateSchema)
  .action(async ({ parsedInput: data }) => {
    const existing = await db.communicationTemplate.findUnique({
      where: { id: data.templateId },
      select: { isSystem: true },
    });
    if (!existing) {
      throw new Error('error.template.notFound');
    }

    // System templates: editor may save design; settings dialog must not rename or change description.
    if (
      existing.isSystem &&
      (data.name !== undefined || data.description !== undefined)
    ) {
      throw new Error('error.template.systemFieldsOnly');
    }

    const dataToApply = existing.isSystem
      ? {
          ...(data.subjectOrFilename !== undefined && { subjectOrFilename: data.subjectOrFilename }),
          ...(data.designJson !== undefined && { designJson: data.designJson }),
          ...(data.htmlContent !== undefined && { htmlContent: data.htmlContent }),
        }
      : {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.subjectOrFilename !== undefined && { subjectOrFilename: data.subjectOrFilename }),
          ...(data.designJson !== undefined && { designJson: data.designJson }),
          ...(data.htmlContent !== undefined && { htmlContent: data.htmlContent }),
        };

    if (Object.keys(dataToApply).length === 0) {
      const unchanged = await db.communicationTemplate.findUnique({
        where: { id: data.templateId },
        select: { id: true, projectId: true, isGlobal: true },
      });
      if (!unchanged) {
        throw new Error('error.template.notFound');
      }
      if (unchanged.isGlobal) {
        revalidatePath('/admin/templates');
      } else if (unchanged.projectId) {
        revalidatePath('/configuration');
      }
      return { id: unchanged.id };
    }

    const template = await db.communicationTemplate.update({
      where: { id: data.templateId },
      data: dataToApply,
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

    return { id: template.id };
  });
