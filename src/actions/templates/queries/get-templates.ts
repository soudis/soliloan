'use server';

import { db } from '@/lib/db';
import { getTemplatesSchema } from '@/lib/schemas/templates';
import { authAction } from '@/lib/utils/safe-action';
import type { Prisma } from '@prisma/client';

export const getTemplatesAction = authAction.schema(getTemplatesSchema).action(async ({ parsedInput: data, ctx }) => {
  // Build where clause based on filters
  const where: Prisma.CommunicationTemplateWhereInput = {};

  if (data.type) {
    where.type = data.type;
  }

  if (data.dataset) {
    where.dataset = data.dataset;
  }

  // Handle project vs global filtering
  if (data.isGlobal === true) {
    // Only global templates - requires admin
    if (!ctx.session.user.isAdmin) {
      throw new Error('error.unauthorized');
    }
    where.isGlobal = true;
  } else if (data.projectId) {
    // Project-specific templates
    if (!ctx.session.user.isAdmin) {
      // Check user has access to this project
      const project = await db.project.count({
        where: { id: data.projectId, managers: { some: { id: ctx.session.user.id } } },
      });
      if (project === 0) {
        throw new Error('error.project.notFound');
      }
    }

    if (data.includeGlobal) {
      // Include both project and global templates
      where.OR = [{ projectId: data.projectId }, { isGlobal: true }];
    } else {
      where.projectId = data.projectId;
    }
  } else if (data.isGlobal === false) {
    // Only non-global (project) templates
    where.isGlobal = false;

    // Non-admin can only see templates from their projects
    if (!ctx.session.user.isAdmin) {
      const managedProjects = await db.project.findMany({
        where: { managers: { some: { id: ctx.session.user.id } } },
        select: { id: true },
      });
      where.projectId = { in: managedProjects.map((p) => p.id) };
    }
  } else {
    // No filter - show accessible templates
    if (ctx.session.user.isAdmin) {
      // Admin sees all
    } else {
      // Non-admin sees their project templates + global templates
      const managedProjects = await db.project.findMany({
        where: { managers: { some: { id: ctx.session.user.id } } },
        select: { id: true },
      });
      where.OR = [{ projectId: { in: managedProjects.map((p) => p.id) } }, { isGlobal: true }];
    }
  }

  const templates = await db.communicationTemplate.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      dataset: true,
      isGlobal: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
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
    orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
  });

  return { templates };
});
