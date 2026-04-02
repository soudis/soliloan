'use server';

import { Entity, Operation } from '@prisma/client';
import { z } from 'zod';
import { createAuditEntry, getManagerContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';
import { getProjectUnsafe } from '../queries/get-project';

export const removeProjectManagerAction = projectAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      managerId: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { projectId, managerId } = parsedInput;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        managers: true,
      },
    });

    if (!project) {
      throw new Error('error.project.notFound');
    }

    const removedManager = project.managers.find((m) => m.id === managerId);
    if (!removedManager) {
      throw new Error('error.configuration.managerNotFound');
    }

    if (project.managers.length <= 1) {
      throw new Error('error.configuration.cannotRemoveLastManager');
    }

    await db.project.update({
      where: { id: projectId },
      data: {
        managers: {
          disconnect: {
            id: managerId,
          },
        },
      },
    });

    const before = project.managers.map((m) => ({ id: m.id, email: m.email }));
    const after = project.managers.filter((m) => m.id !== managerId).map((m) => ({ id: m.id, email: m.email }));
    await createAuditEntry(db, {
      entity: Entity.project,
      operation: Operation.UPDATE,
      primaryKey: projectId,
      before: { managers: before },
      after: { managers: after },
      context: {
        ...getManagerContext(removedManager),
        managerAction: 'removed',
      },
      projectId,
    });

    const updated = await getProjectUnsafe(projectId);
    return { project: updated };
  });
