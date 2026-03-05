'use server';

import { omit } from 'lodash';
import moment from 'moment';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';

export async function getProjects() {
  const session = await auth();
  const userId = session?.user.isAdmin ? undefined : session?.user.id;
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
      managers: true,
      configuration: {
        include: {
          loanTemplates: true,
        },
      },
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
    orderBy: {
      configuration: {
        name: 'asc',
      },
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
