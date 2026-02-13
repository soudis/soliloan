'use server';

import { omit } from 'lodash';
import moment from 'moment';
import { db } from '@/lib/db';
import { projectIdSchema } from '@/lib/schemas/common';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

export async function getProjectUnsafe(projectId: string) {
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
      lenders: {
        include: { loans: { include: { transactions: true } } },
      },
      managers: true,
    },
  });

  if (!project) {
    throw new Error('error.project.notFound');
  }

  return {
    project: {
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
    },
  };
}

export const getProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    return getProjectUnsafe(projectId);
  });
