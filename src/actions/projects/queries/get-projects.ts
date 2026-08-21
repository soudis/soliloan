'use server';

import { omit } from 'lodash';
import moment from 'moment';
import { db } from '@/lib/db';
import type { RequiredSession } from '@/lib/require-session';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { findSidebarViews } from '@/lib/views/find-sidebar-views';

export async function getProjects(session: RequiredSession) {
  const userId = session.user.isAdmin ? undefined : session.user.id;
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

  const mappedProjects = projects.map((project) => ({
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
  }));

  /** Pinned sidebar views: user’s personal (no project) + all for projects user can access (same scope as `projects`). */
  const uid = session.user.id;
  const sidebarViews = uid
    ? await findSidebarViews(
        uid,
        projects.map((p) => p.id),
      )
    : [];

  return {
    projects: mappedProjects,
    sidebarViews,
  };
}
