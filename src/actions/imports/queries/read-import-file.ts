'use server';

import { parseImportFile } from '@/lib/import/parse-file';
import { importFileInputSchema, importFileOptionsSchema } from '@/lib/schemas/import';
import { projectAction } from '@/lib/utils/safe-action';

/** Reads an uploaded import file so the wizard can map its columns. Nothing is stored. */
export const readImportFileAction = projectAction
  .inputSchema(importFileInputSchema.extend({ options: importFileOptionsSchema }))
  .action(async ({ parsedInput: { fileName, base64Data, options } }) => {
    return parseImportFile(fileName, new Uint8Array(Buffer.from(base64Data, 'base64')), options);
  });
