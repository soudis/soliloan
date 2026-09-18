'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { restoreSystemTemplateFromFileSchema } from '@/lib/schemas/templates';
import { isEmptyDesignJson } from '@/lib/templates/default-starter-templates';
import { loadSystemTemplateDesignFile } from '@/lib/templates/load-system-template-design';
import { adminAction } from '@/lib/utils/safe-action';

type RestorableSystemTemplate = {
  id: string;
  systemKey: string;
};

async function loadDesignForSystemKey(systemKey: string) {
  try {
    const loaded = await loadSystemTemplateDesignFile(systemKey);
    if (!loaded || isEmptyDesignJson(loaded.designJson)) {
      throw new Error('error.template.systemDesignFileNotFound');
    }
    return loaded;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('error.template.')) {
      throw error;
    }
    throw new Error('error.template.systemDesignFileInvalid');
  }
}

async function applyDesignFromFile(template: RestorableSystemTemplate) {
  const loaded = await loadDesignForSystemKey(template.systemKey);
  await db.communicationTemplate.update({
    where: { id: template.id },
    data: {
      designJson: loaded.designJson,
      ...(loaded.subjectOrFilename !== null ? { subjectOrFilename: loaded.subjectOrFilename } : {}),
    },
  });
  revalidatePath(`/admin/templates/${template.id}`);
}

function revalidateTemplateList() {
  revalidatePath('/admin/templates');
}

export const restoreSystemTemplateFromFileAction = adminAction
  .inputSchema(restoreSystemTemplateFromFileSchema)
  .action(async ({ parsedInput: data }) => {
    const template = await db.communicationTemplate.findUnique({
      where: { id: data.templateId },
      select: {
        id: true,
        isGlobal: true,
        isSystem: true,
        systemKey: true,
        projectId: true,
      },
    });

    if (!template) {
      throw new Error('error.template.notFound');
    }

    if (!template.isGlobal || !template.isSystem || template.projectId || !template.systemKey) {
      throw new Error('error.template.cannotRestoreFromFile');
    }

    await applyDesignFromFile({ id: template.id, systemKey: template.systemKey });
    revalidateTemplateList();

    return { id: template.id };
  });

export const restoreAllSystemTemplatesFromFileAction = adminAction.inputSchema(z.object({})).action(async () => {
  const templates = await db.communicationTemplate.findMany({
    where: {
      isGlobal: true,
      isSystem: true,
      projectId: null,
      systemKey: { not: null },
    },
    select: {
      id: true,
      systemKey: true,
    },
  });

  let restored = 0;
  let failed = 0;

  for (const template of templates) {
    if (!template.systemKey) continue;
    try {
      await applyDesignFromFile({ id: template.id, systemKey: template.systemKey });
      restored += 1;
    } catch {
      failed += 1;
    }
  }

  revalidateTemplateList();

  return { restored, failed, total: restored + failed };
});
