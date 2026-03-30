'use server';

import { omit } from 'lodash';
import moment from 'moment';
import { db } from '@/lib/db';
import { projectIdSchema } from '@/lib/schemas/common';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';
import type { ProjectWithConfiguration } from '@/types/projects';

export async function getProjectUnsafe(projectId: string): Promise<ProjectWithConfiguration> {
  // Fetch the project
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      configuration: {
        include: {
          loanTemplates: true,
        },
      },
      managers: true,
      lenders: {
        include: { loans: { include: { transactions: true } } },
      },
      templates: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error('error.project.notFound');
  }

  return {
    ...omit(project, ['lenders']),
    managers: project.managers,
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

export const getProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    return getProjectUnsafe(projectId);
  });
