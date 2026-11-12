'use server';

import { ExportType } from '@prisma/client';
import moment from 'moment';
import { z } from 'zod';

import { generateExportUnsafe } from '@/lib/exports/generate-export';
import { projectAction } from '@/lib/utils/safe-action';

export const generateExportAction = projectAction
  .schema(
    z.object({
      projectId: z.string(),
      type: z.enum(ExportType),
      year: z
        .number()
        .int()
        .min(1900)
        .refine((year) => year <= moment().year(), 'error.exports.futureYear'),
    }),
  )
  .action(async ({ parsedInput: { projectId, type, year }, ctx }) => {
    return generateExportUnsafe({ projectId, type, year, userId: ctx.session.user.id as string });
  });
