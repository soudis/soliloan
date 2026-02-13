'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

const bulkDeleteLoansSchema = z.object({
  projectId: z.string(),
  loanIds: z.array(z.string().min(1)).min(1),
});

export const bulkDeleteLoansAction = projectAction
  .schema(bulkDeleteLoansSchema)
  .action(async ({ parsedInput: { loanIds, projectId } }) => {
    // Fetch all loans to verify they belong to this project (via lender) and for audit trail
    const loans = await db.loan.findMany({
      where: {
        id: { in: loanIds },
        lender: { projectId },
      },
      include: { lender: true },
    });

    if (loans.length === 0) {
      throw new Error('error.loan.notFound');
    }

    // Create audit trail entries before deletion
    for (const loan of loans) {
      await createAuditEntry(db, {
        entity: Entity.loan,
        operation: Operation.DELETE,
        primaryKey: loan.id,
        before: removeNullFields(loan),
        after: {},
        context: {
          ...getLenderContext(loan.lender),
          ...getLoanContext(loan),
        },
        projectId: loan.lender.projectId,
      });
    }

    // Delete all loans
    await db.loan.deleteMany({
      where: {
        id: { in: loans.map((l) => l.id) },
        lender: { projectId },
      },
    });

    // Revalidate the loans page
    revalidatePath(`/${projectId}/loans`);

    // Also revalidate affected lender pages
    const uniqueLenderIds = [...new Set(loans.map((l) => l.lenderId))];
    for (const lenderId of uniqueLenderIds) {
      revalidatePath(`/${projectId}/lenders/${lenderId}`);
    }

    return { success: true, deletedCount: loans.length };
  });
