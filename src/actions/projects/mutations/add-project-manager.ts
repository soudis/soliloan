'use server';

import { Entity, Operation } from '@prisma/client';
import { z } from 'zod';
import { createAuditEntry, getManagerContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { type ProjectManagerInviteContext, sendProjectManagerInvitationEmail } from '@/lib/email';
import { getInviteValidDays } from '@/lib/env';
import { loadProject } from '@/lib/projects/get-project';
import { generateToken } from '@/lib/token';
import { normalizeStoredEmail } from '@/lib/utils/email';
import { hashPassword } from '@/lib/utils/password';
import { projectAction } from '@/lib/utils/safe-action';

export const addProjectManagerAction = projectAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      email: z.string().email(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { projectId, email } = parsedInput;
    const normalizedEmail = normalizeStoredEmail(email);

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { managers: true, configuration: true },
    });

    if (!project) throw new Error('error.project.notFound');
    if (!project.configuration) throw new Error('error.configuration.notFound');

    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    const existingUserId = user?.id;
    const alreadyManager = existingUserId ? project.managers.some((m) => m.id === existingUserId) : false;
    if (alreadyManager) {
      throw new Error('error.configuration.managerAlreadyAdded');
    }

    const isNewUser = !user;

    if (!user) {
      const invitationToken = generateToken();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + getInviteValidDays());
      const passwordHashed = await hashPassword(generateToken());

      user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: '',
          emailVerified: null,
          password: passwordHashed,
          inviteToken: invitationToken,
          inviteTokenExpiresAt: expirationDate,
          passwordResetToken: invitationToken,
          passwordResetTokenExpiresAt: expirationDate,
          lastInvited: new Date(),
          language: project.configuration.userLanguage ?? undefined,
        },
      });
    }

    await db.project.update({
      where: { id: projectId },
      data: {
        managers: {
          connect: { id: user.id },
        },
      },
    });

    const before = project.managers.map((m) => ({ id: m.id, email: m.email }));
    const after = [...project.managers, user].map((m) => ({ id: m.id, email: m.email }));
    await createAuditEntry(db, {
      entity: Entity.project,
      operation: Operation.UPDATE,
      primaryKey: projectId,
      before: { managers: before },
      after: { managers: after },
      context: {
        ...getManagerContext(user),
        managerAction: 'added',
      },
      projectId,
    });

    if (isNewUser && user.inviteToken) {
      const managerContext: ProjectManagerInviteContext = {
        projectId: project.id,
        projectName: project.configuration.name,
        projectSlug: project.slug,
        configData: project.configuration as unknown as Record<string, unknown>,
      };

      await sendProjectManagerInvitationEmail(
        normalizedEmail,
        user.name || project.configuration.name,
        user.inviteToken,
        user.language || 'de',
        managerContext,
      );
    }

    const updated = await loadProject(projectId);
    return { project: updated };
  });
