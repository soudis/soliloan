'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createTemplateSchema } from '@/lib/schemas/templates';
import { adminAction, projectAction } from '@/lib/utils/safe-action';

// Create template - uses projectAction for project templates, adminAction for global
export const createTemplateAction = projectAction
  .inputSchema(createTemplateSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // If isGlobal is true but user is not admin, reject
    if (data.isGlobal && !ctx.session.user.isAdmin) {
      throw new Error('error.unauthorized');
    }

    const template = await db.communicationTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        dataset: data.dataset,
        designJson: data.designJson ?? {},
        isGlobal: data.isGlobal ?? false,
        project: data.isGlobal ? undefined : { connect: { id: data.projectId } },
        createdBy: { connect: { id: ctx.session.user.id } },
      },
    });

    if (!data.isGlobal && data.projectId) {
      revalidatePath(`/${data.projectId}/configuration`);
    } else {
      revalidatePath('/admin/templates');
    }

    return { id: template.id };
  });

// Create global template - admin only
export const createGlobalTemplateAction = adminAction
  .inputSchema(createTemplateSchema.omit({ projectId: true, isGlobal: true }))
  .action(async ({ parsedInput: data, ctx }) => {
    const template = await db.communicationTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        dataset: data.dataset,
        designJson: data.designJson ?? {},
        isGlobal: true,
        project: undefined,
        createdBy: { connect: { id: ctx.session.user.id } },
      },
    });

    revalidatePath('/admin/templates');

    return { id: template.id };
  });
