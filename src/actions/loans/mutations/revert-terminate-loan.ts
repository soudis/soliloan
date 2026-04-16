'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getChangedFields, getLenderContext, getLoanContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { loanAction } from '@/lib/utils/safe-action';

export const revertTerminateLoanAction = loanAction
  .inputSchema(
    z.object({
      loanId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { loanId } }) => {
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      include: { lender: true },
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.terminationType !== 'TERMINATION') {
      throw new Error('error.loan.invalidTerminationType');
    }

    if (!loan.terminationDate) {
      throw new Error('error.loan.notTerminated');
    }

    const updatedLoan = await db.loan.update({
      where: { id: loanId },
      data: { terminationDate: null },
      include: { lender: true },
    });

    const { before, after } = getChangedFields(loan, updatedLoan);
    if (Object.keys(before).length > 0) {
      await createAuditEntry(db, {
        entity: Entity.loan,
        operation: Operation.UPDATE,
        primaryKey: loanId,
        before,
        after,
        context: {
          ...getLenderContext(loan.lender),
          ...getLoanContext(updatedLoan),
        },
        projectId: loan.lender.projectId,
      });
    }

    revalidatePath(`/lenders/${loan.lenderId}`);
    revalidatePath('/loans');

    return { loan: updatedLoan };
  });
