'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { runMigration } from '@/lib/migration/import';
import type { MigrationReport } from '@/lib/migration/types';
import { migrationFormSchema } from '@/lib/schemas/migration';
import { normalizeStoredEmail } from '@/lib/utils/email';
import { adminAction } from '@/lib/utils/safe-action';

export const migrateProjectAction = adminAction
  .inputSchema(migrationFormSchema)
  .action(async ({ ctx, parsedInput }): Promise<MigrationReport> => {
    try {
      const userId = ctx.session.user.id;
      if (!userId) {
        throw new Error('error.unauthorized');
      }

      const currentUserEmail = ctx.session.user.email ? normalizeStoredEmail(ctx.session.user.email) : null;

      const report = await runMigration(db, {
        baseUrl: parsedInput.baseUrl,
        accessToken: parsedInput.accessToken,
        currentUserId: userId,
        currentUserEmail,
        anonymize: parsedInput.anonymize,
        environment: process.env.ENVIRONMENT ?? 'dev',
      });

      revalidatePath('/projects');

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        projectId: null,
        projectSlug: null,
        counts: { admins: 0, lenders: 0, loans: 0, transactions: 0, files: 0, notes: 0 },
        warnings: [],
        idMappings: [],
        skippedFiles: 0,
        unmappedFields: [],
        anonymized: parsedInput.anonymize,
        error: message,
      };
    }
  });
