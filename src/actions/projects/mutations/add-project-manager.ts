'use server';

import { omit } from 'lodash';
import moment from 'moment';

import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';
import { z } from 'zod';

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
        (loan) =>
          loan.transactions.filter((t) => moment(t.date).isBefore(moment().startOf('year'))).length > 0,
      ),
    ),
    configuration: {
      ...project.configuration,
      lenderAdditionalFields: parseAdditionalFieldConfig(project.configuration.lenderAdditionalFields) ?? [],
      loanAdditionalFields: parseAdditionalFieldConfig(project.configuration.loanAdditionalFields) ?? [],
    },
  };
}

export const addProjectManagerAction = projectAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      email: z.string().email(),
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { projectId, email } = parsedInput;

    let user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: email.trim(),
          emailVerified: null,
        },
      });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { managers: true },
    });
    if (!project) {
      throw new Error('error.project.notFound');
    }
    const alreadyManager = project.managers.some((m) => m.id === user.id);
    if (alreadyManager) {
      throw new Error('error.configuration.managerAlreadyAdded');
    }

    await db.project.update({
      where: { id: projectId },
      data: {
        managers: {
          connect: { id: user.id },
        },
      },
    });

    const updated = await getProjectWithConfiguration(projectId);
    return { project: updated };
  });
