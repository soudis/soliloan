'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { duplicateTemplateSchema } from '@/lib/schemas/templates';
import { authAction } from '@/lib/utils/safe-action';

export const duplicateTemplateAction = authAction
  .inputSchema(duplicateTemplateSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Get source template
    const sourceTemplate = await db.communicationTemplate.findUnique({
      where: { id: data.id },
    });

    if (!sourceTemplate) {
      throw new Error('error.template.notFound');
    }

    // Check access - can duplicate global templates, or project templates user manages
    if (!sourceTemplate.isGlobal && sourceTemplate.projectId) {
      if (!ctx.session.user.isAdmin) {
        const project = await db.project.count({
          where: { id: sourceTemplate.projectId, managers: { some: { id: ctx.session.user.id } } },
        });
        if (project === 0) {
          throw new Error('error.template.notFound');
        }
      }
    }

    // If target is a project, check user has access
    if (data.projectId) {
      if (!ctx.session.user.isAdmin) {
        const project = await db.project.count({
          where: { id: data.projectId, managers: { some: { id: ctx.session.user.id } } },
        });
        if (project === 0) {
          throw new Error('error.project.notFound');
        }
      }
    } else if (!ctx.session.user.isAdmin) {
      // Creating global template requires admin
      throw new Error('error.unauthorized');
    }

    const isGlobal = !data.projectId;

    const newTemplate = await db.communicationTemplate.create({
      data: {
        name: data.name,
        description: sourceTemplate.description,
        type: sourceTemplate.type,
        dataset: sourceTemplate.dataset,
        designJson: sourceTemplate.designJson ?? {},
        htmlContent: sourceTemplate.htmlContent,
        isGlobal,
        project: data.projectId ? { connect: { id: data.projectId } } : undefined,
        createdBy: { connect: { id: ctx.session.user.id } },
      },
    });

    if (isGlobal) {
      revalidatePath('/admin/templates');
    } else if (data.projectId) {
      revalidatePath(`/${data.projectId}/configuration`);
    }

    return { id: newTemplate.id };
  });
