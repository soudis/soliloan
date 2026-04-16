'use server';

import type { Prisma, TemplateType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { createTemplateSchema } from '@/lib/schemas/templates';
import {
  getDefaultStarterTemplateContent,
  isEmptyDesignJson,
} from '@/lib/templates/default-starter-templates';
import { adminAction, projectAction } from '@/lib/utils/safe-action';

async function resolveDesignAndSubjectForCreate(input: {
  type: TemplateType;
  designJson: unknown;
  subjectOrFilename: string | null | undefined;
  sourceTemplateId?: string;
}): Promise<{ designJson: Prisma.InputJsonValue; subjectOrFilename: string | null }> {
  let designJson: Prisma.InputJsonValue = (input.designJson ?? {}) as Prisma.InputJsonValue;

  if (input.sourceTemplateId) {
    const source = await db.communicationTemplate.findUnique({
      where: { id: input.sourceTemplateId },
      select: { designJson: true, isGlobal: true, isSystem: true },
    });
    if (source?.isGlobal && !source.isSystem) {
      designJson = (source.designJson ?? {}) as Prisma.InputJsonValue;
    }
  }

  const raw = input.subjectOrFilename;
  let subjectOrFilename: string | null =
    typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null;

  if (isEmptyDesignJson(designJson)) {
    const starter = await getDefaultStarterTemplateContent(input.type);
    if (starter) {
      designJson = starter.designJson as Prisma.InputJsonValue;
      if (subjectOrFilename == null && starter.subjectOrFilename) {
        subjectOrFilename = starter.subjectOrFilename;
      }
    }
  }

  return { designJson, subjectOrFilename };
}

// Create template - uses projectAction for project templates, adminAction for global
export const createTemplateAction = projectAction
  .inputSchema(createTemplateSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    if (data.isGlobal && !ctx.session.user.isAdmin) {
      throw new Error('error.unauthorized');
    }

    const { designJson, subjectOrFilename } = await resolveDesignAndSubjectForCreate({
      type: data.type,
      designJson: data.designJson,
      subjectOrFilename: data.subjectOrFilename,
      sourceTemplateId: data.sourceTemplateId,
    });

    const template = await db.communicationTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        subjectOrFilename,
        type: data.type,
        dataset: data.dataset,
        designJson,
        isGlobal: data.isGlobal ?? false,
        project: data.isGlobal ? undefined : { connect: { id: data.projectId } },
        createdBy: { connect: { id: ctx.session.user.id } },
      },
    });

    if (!data.isGlobal && data.projectId) {
      revalidatePath('/configuration');
    } else {
      revalidatePath('/admin/templates');
    }

    return { id: template.id };
  });

// Create global template - admin only
export const createGlobalTemplateAction = adminAction
  .inputSchema(createTemplateSchema.omit({ projectId: true, isGlobal: true }))
  .action(async ({ parsedInput: data, ctx }) => {
    const { designJson, subjectOrFilename } = await resolveDesignAndSubjectForCreate({
      type: data.type,
      designJson: data.designJson,
      subjectOrFilename: data.subjectOrFilename,
    });

    const template = await db.communicationTemplate.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        subjectOrFilename,
        type: data.type,
        dataset: data.dataset,
        designJson,
        isGlobal: true,
        project: undefined,
        createdBy: { connect: { id: ctx.session.user.id } },
      },
    });

    revalidatePath('/admin/templates');

    return { id: template.id };
  });
