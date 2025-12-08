'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getChangedFields, getLenderContext, getLoanContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { loanFormSchema } from '@/lib/schemas/loan';
import { loanAction } from '@/lib/utils/safe-action';
import { z } from 'zod';

export const updateLoanAction = loanAction
  .inputSchema(
    z.object({
      loanId: z.string(),
      data: loanFormSchema,
    }),
  )
  .action(async ({ parsedInput: { loanId, data } }) => {
    // Fetch the loan

    console.log(data.terminationDate);

    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                configuration: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    // Update the loan
    const updatedLoan = await db.loan.update({
      where: {
        id: loanId,
      },
      data: {
        signDate: data.signDate ?? new Date(),
        amount: data.amount,
        interestRate: data.interestRate,
        terminationType: data.terminationType,
        endDate: data.endDate,
        terminationDate: data.terminationDate,
        terminationPeriod: data.terminationPeriod,
        terminationPeriodType: data.terminationPeriodType,
        duration: data.duration,
        durationType: data.durationType,
        altInterestMethod: data.altInterestMethod,
        contractStatus: data.contractStatus,
        additionalFields: data.additionalFields ?? {},
      },
      include: {
        lender: true,
      },
    });

    // Create audit trail entry
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

    // Revalidate the lender page
    revalidatePath(`/lenders/${loan.lenderId}`);

    return { loan: updatedLoan };
  });
