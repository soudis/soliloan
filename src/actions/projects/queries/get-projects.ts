'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { managerAction } from '@/lib/utils/safe-action';
import { omit } from 'lodash';
import moment from 'moment';

async function getProjects(userId?: string) {
  // Fetch all projects for the user
  const projects = await db.project.findMany({
    ...(userId && {
      where: {
        managers: {
          some: {
            id: userId,
          },
        },
      },
    }),
    include: {
      configuration: {
        include: {
          loanTemplates: true,
        },
      },
      lenders: {
        include: { loans: { include: { transactions: true } } },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return {
    projects: projects.map((project) => ({
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
    })),
  };
}

export const getProjectsAction = managerAction.action(async ({ ctx }) => {
  return await getProjects(ctx.session.user.isAdmin ? undefined : ctx.session.user.id);
});
