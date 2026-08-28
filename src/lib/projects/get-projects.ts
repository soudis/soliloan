import { cache } from 'react';

import { db } from '@/lib/db';
import type { RequiredSession } from '@/lib/require-session';
import { findSidebarViews } from '@/lib/views/find-sidebar-views';

import { mapProjectWithConfiguration, projectWithConfigurationInclude } from './get-project';

async function loadProjects(session: RequiredSession) {
  const userId = session.user.isAdmin ? undefined : session.user.id;
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
    include: projectWithConfigurationInclude,
    orderBy: {
      configuration: {
        name: 'asc',
      },
    },
  });

  const mappedProjects = projects.map((project) => mapProjectWithConfiguration(project, false));

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

/** Request-memoized project list for RSC (layout + page). */
export const getProjects = cache(loadProjects);
