'use server';

import { Entity, Operation } from '@prisma/client';
import { omit } from 'lodash';
import moment from 'moment';
import { z } from 'zod';
import { createAuditEntry, getManagerContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

async function getProjectWithConfiguration(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      managers: true,
      configuration: {
        include: { loanTemplates: true },
      },
      lenders: {
        include: { loans: { include: { transactions: true } } },
      },
    },
  });

  if (!project) return null;

  return {
    ...omit(project, ['lenders']),
    hasHistoricTransactions: project.lenders.some((lender) =>
      lender.loans.some(
        (loan) => loan.transactions.filter((t) => moment(t.date).isBefore(moment().startOf('year'))).length > 0,
      ),
    ),
    configuration: {
      ...project.configuration,
      lenderAdditionalFields: parseAdditionalFieldConfig(project.configuration.lenderAdditionalFields) ?? [],
      loanAdditionalFields: parseAdditionalFieldConfig(project.configuration.loanAdditionalFields) ?? [],
    },
  };
}

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

    const updated = await getProjectWithConfiguration(projectId);
    return { project: updated };
  });
