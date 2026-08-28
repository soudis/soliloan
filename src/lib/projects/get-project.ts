import moment from 'moment';
import { cache } from 'react';

import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import type { ProjectWithConfiguration } from '@/types/projects';

export const projectWithConfigurationInclude = {
  configuration: {
    include: {
      loanTemplates: true,
    },
  },
  managers: true,
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
} as const;

export function mapProjectWithConfiguration(
  project: {
    configuration: {
      lenderAdditionalFields: unknown;
      loanAdditionalFields: unknown;
    };
  },
  hasHistoricTransactions: boolean,
): ProjectWithConfiguration {
  return {
    ...(project as unknown as ProjectWithConfiguration),
    hasHistoricTransactions,
    configuration: {
      ...(project as unknown as ProjectWithConfiguration).configuration,
      lenderAdditionalFields: parseAdditionalFieldConfig(project.configuration.lenderAdditionalFields) ?? [],
      loanAdditionalFields: parseAdditionalFieldConfig(project.configuration.loanAdditionalFields) ?? [],
    },
  };
}

/** Uncached DB load — use after mutations so React cache cannot return a pre-write snapshot. */
export async function loadProject(projectId: string): Promise<ProjectWithConfiguration> {
  const startOfYear = moment().startOf('year').toDate();

  const [project, historic] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: projectWithConfigurationInclude,
    }),
    db.transaction.findFirst({
      where: {
        date: { lt: startOfYear },
        loan: { lender: { projectId } },
      },
      select: { id: true },
    }),
  ]);

  if (!project) {
    throw new Error('error.project.notFound');
  }

  return mapProjectWithConfiguration(project, Boolean(historic));
}

/** Request-memoized project fetch for RSC (layout + page). */
export const getProjectUnsafe = cache(loadProject);
