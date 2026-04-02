'use server';

import crypto from 'node:crypto';
import { Entity, Operation } from '@prisma/client';
import { z } from 'zod';
import { createAuditEntry, getManagerContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/utils/password';
import { projectAction } from '@/lib/utils/safe-action';
import { getProjectUnsafe } from '../queries/get-project';

export const addProjectManagerAction = projectAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      email: z.email(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { projectId, email } = parsedInput;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { managers: true, configuration: true },
    });

    if (!project) throw new Error('error.project.notFound');

    let user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      const password = 'test12345xy';
      const passwordHashed = await hashPassword(password);
      const invitationToken = generateInviteToken();

      if (!project.configuration) throw new Error('error.configuration.notFound');
      const configuration = project.configuration;

      user = await db.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: '',
          emailVerified: null,
          password: passwordHashed,
          inviteToken: invitationToken,
          lastInvited: new Date(),
          language: configuration.userLanguage ?? undefined,
          theme: configuration.userTheme ?? undefined,
        },
      });
    }

    const alreadyManager = project.managers.some((m) => m.id === user.id);
    if (alreadyManager) {
      throw new Error('error.configuration.managerAlreadyAdded');
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

    const updated = await getProjectUnsafe(projectId);
    return { project: updated };
  });

function generateInviteToken(byteLength = 32): string {
  const bytes = crypto.randomBytes(byteLength);
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
