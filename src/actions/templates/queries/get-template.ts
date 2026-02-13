'use server';

import { db } from '@/lib/db';
import { getTemplateSchema } from '@/lib/schemas/templates';
import { authAction } from '@/lib/utils/safe-action';

export const getTemplateAction = authAction.schema(getTemplateSchema).action(async ({ parsedInput: data, ctx }) => {
  const template = await db.communicationTemplate.findUnique({
    where: { id: data.id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error('error.template.notFound');
  }

  // Check access - global templates require admin, project templates require manager
  if (template.isGlobal) {
    if (!ctx.session.user.isAdmin) {
      throw new Error('error.template.notFound');
    }
  } else if (template.projectId) {
    if (!ctx.session.user.isAdmin) {
      const project = await db.project.count({
        where: { id: template.projectId, managers: { some: { id: ctx.session.user.id } } },
      });
      if (project === 0) {
        throw new Error('error.template.notFound');
      }
    }
  }

  return { template };
});
