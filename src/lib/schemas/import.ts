import { z } from 'zod';

import { IMPORT_DELIMITERS, IMPORT_ENCODINGS } from '@/lib/import/types';

export const importFileOptionsSchema = z.object({
  sheet: z.string().nullish(),
  delimiter: z.enum(IMPORT_DELIMITERS).nullish(),
  encoding: z.enum(IMPORT_ENCODINGS).nullish(),
});

export const importSettingsSchema = z.object({
  file: importFileOptionsSchema,
  format: z.object({
    decimalSeparator: z.enum([',', '.']),
    dateOrder: z.enum(['DMY', 'YMD', 'MDY']),
  }),
  columns: z.record(z.string(), z.number().int().min(0)),
  defaults: z.record(z.string(), z.string()),
  valueAssignments: z.record(z.string(), z.record(z.string(), z.string())),
  loanTemplateId: z.string().nullable(),
});

/** An import file as the client sends it: base64, because server actions cannot take a File inside an object. */
export const importFileInputSchema = z.object({
  projectId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  base64Data: z.string().min(1),
});
