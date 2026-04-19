'use server';

import { ViewType } from '@prisma/client';
import { omit } from 'lodash';
import moment from 'moment';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import type { SidebarNavView } from '@/types/sidebar-nav';

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
  let sidebarViews: SidebarNavView[] = [];
  const uid = session?.user?.id;
  if (uid) {
    const projectIds = projects.map((p) => p.id);
    sidebarViews = await db.view.findMany({
      where: {
        showInSidebar: true,
        type: { in: [ViewType.LENDER, ViewType.LOAN] },
        OR: [{ userId: uid, projectId: null }, ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : [])],
      },
      select: { id: true, name: true, type: true, projectId: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  return {
    projects: mappedProjects,
    sidebarViews,
  };
}
