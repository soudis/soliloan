'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { loanIdSchema } from '@/lib/schemas/common';
import { loanAction } from '@/lib/utils/safe-action';

export const deleteLoanAction = loanAction.inputSchema(loanIdSchema).action(async ({ parsedInput: { loanId } }) => {
  // Fetch the loan to check existence (loanAction already checks existence/access but we need lenderId for revalidate)
  // Actually loanAction checks if user is manager, but we might want loan data for audit.
  // We can fetch loan inside action.
  const loan = await db.loan.findUnique({
    where: { id: loanId },
    include: { lender: true },
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  // Delete the loan
  await db.loan.delete({
    where: {
      id: loanId,
    },
  });

  // Create audit trail entry
  await createAuditEntry(db, {
    entity: Entity.loan,
    operation: Operation.DELETE,
    primaryKey: loanId,
    before: removeNullFields(loan),
    after: {},
    context: {
      ...getLenderContext(loan.lender),
      ...getLoanContext(loan),
    },
    projectId: loan.lender.projectId,
  });

  // Revalidate the lender page
  revalidatePath(`/lenders/${loan.lenderId}`);
  // Revalidate the loans page for the project
  revalidatePath(`/${loan.lender.projectId}/loans`);

  return { success: true };
});
