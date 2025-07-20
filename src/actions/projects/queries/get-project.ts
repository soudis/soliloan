'use server';

import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { omit } from 'lodash';
import moment from 'moment';

export async function getProject(projectId: string) {
  // Fetch the project
  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      managers: true,
      configuration: {
        include: {
          loanTemplates: true,
        },
      },
      lenders: {
        include: { loans: { include: { transactions: true } } },
      },
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
