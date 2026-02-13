'use server';

import { Entity, InterestMethod, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import type { Session } from 'next-auth';

import { createAuditEntry, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import type { ProjectFormData } from '@/lib/schemas/project';
import { projectFormSchema } from '@/lib/schemas/project';
import { adminAction } from '@/lib/utils/safe-action';
import { merge } from 'lodash';

export const createProjectAction = adminAction.inputSchema(projectFormSchema).action(async ({ ctx, parsedInput }) => {
  return await createProject(parsedInput, ctx.session);
});

async function createProject(data: ProjectFormData, session: Session) {
  const baseSlug = generateSlug(data.name);
  const slug = await ensureUniqueSlug(baseSlug);

  // Create project with configuration
  const project = await db.project.create({
    data: {
      slug,
      configuration: {
        create: {
          name: data.name,
          interestMethod: InterestMethod.ACT_360_COMPOUND,
        },
      },
      managers: {
        connect: {
          id: session.user.id,
        },
      },
    },
    include: {
      configuration: true,
    },
  });

  // Create audit trail entry
  await createAuditEntry(db, {
    entity: Entity.project,
    operation: Operation.CREATE,
    primaryKey: project.id,
    before: {},
    after: removeNullFields(project),
    context: {},
    projectId: project.id,
  });

  // Revalidate projects page
  revalidatePath('/projects');

  // Format project to match ProjectWithConfiguration type
  const projectWithConfiguration = merge({}, project, {
    hasHistoricTransactions: false,
    configuration: {
      loanTemplates: [],
      lenderAdditionalFields: [],
      loanAdditionalFields: [],
    },
  });

  return projectWithConfiguration;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.project.findUnique({
      where: { slug },
    });

    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}
