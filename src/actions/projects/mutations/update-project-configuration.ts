'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { getProject } from '@/actions/projects/queries/get-project';
import { createAuditEntry, getChangedFields, removeNullFields } from '@/lib/audit-trail';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { type ConfigurationFormData, configurationFormSchema } from '@/lib/schemas/configuration';
import { projectManageAction } from '@/lib/utils/safe-action';
import { z } from 'zod';

export async function updateConfiguration(projectId: string, data: ConfigurationFormData) {
  const session = await auth();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // Fetch the current project
  const { project } = await getProject(projectId);

  if (!project) {
    throw new Error('error.project.notFound');
  }

  // Get the current configuration for audit trail
  const currentConfig = project.configuration;

  console.log('data', data);

  // Update the project configuration
  const configuration = await db.configuration.update({
    where: {
      id: project.configurationId,
    },
    data,
  });

  console.log('configuration', configuration);

  // Create audit trail entry
  const { before, after } = getChangedFields(currentConfig, configuration);
  if (Object.keys(before).length > 0) {
    await createAuditEntry(db, {
      entity: Entity.configuration,
      operation: Operation.UPDATE,
      primaryKey: configuration.id,
      before,
      after,
      context: {},
      projectId,
    });
  }

  // Revalidate the project configuration page
  revalidatePath('/configuration');

  return getProject(projectId);
}

export const updateConfigurationAction = projectManageAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      data: configurationFormSchema,
    }),
  )
  .action(async ({ ctx, parsedInput }) => updateConfiguration(ctx.projectId, parsedInput.data));
