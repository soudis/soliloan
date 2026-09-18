'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { type ProjectManagerInviteContext, sendProjectManagerInvitationEmail } from '@/lib/email';
import { rotateManagerInvitationTokens } from '@/lib/invites/rotate-manager-invitation';
import { loadProject } from '@/lib/projects/get-project';
import { projectAction } from '@/lib/utils/safe-action';

export const resendProjectManagerInvitationAction = projectAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      managerId: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { projectId, managerId } = parsedInput;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { managers: true, configuration: true },
    });

    if (!project) throw new Error('error.project.notFound');
    if (!project.configuration) throw new Error('error.configuration.notFound');

    const manager = project.managers.find((m) => m.id === managerId);
    if (!manager) {
      throw new Error('error.configuration.managerNotFound');
    }
    if (!manager.email) {
      throw new Error('error.configuration.managerInviteNotPending');
    }
    if (!manager.inviteToken) {
      throw new Error('error.configuration.managerInviteNotPending');
    }

    const invitationToken = await rotateManagerInvitationTokens(manager.id);

    const managerContext: ProjectManagerInviteContext = {
      projectId: project.id,
      projectName: project.configuration.name,
      projectSlug: project.slug,
      configData: project.configuration as unknown as Record<string, unknown>,
    };

    await sendProjectManagerInvitationEmail(
      manager.email,
      manager.name || project.configuration.name,
      invitationToken,
      manager.language || 'de',
      managerContext,
    );

    const updated = await loadProject(projectId);
    return { project: updated };
  });
