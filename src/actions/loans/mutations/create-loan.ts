'use server';

import { Entity, Operation, PaymentType, TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { loanFormSchema } from '@/lib/schemas/loan';
import { lenderAction } from '@/lib/utils/safe-action';

export const createLoanAction = lenderAction.inputSchema(loanFormSchema).action(async ({ parsedInput: data }) => {
  // Create the loan

  const loan = await db.loan.create({
    data: {
      lender: {
        connect: {
          id: data.lenderId,
        },
      },
      // loanNumber is autoincrement
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
  // Note: loan includes lender but we need lender.projectId for audit.
  // lenderAction ensures we have access, but we need projectId for audit record.
  // We can fetch it or trust lender include.
  // Actually `loan.lender` in `include: { lender: true }` gives us `projectId`.
  await createAuditEntry(db, {
    entity: Entity.loan,
    operation: Operation.CREATE,
    primaryKey: loan.id,
    before: {},
    after: removeNullFields(loan),
    context: {
      ...getLenderContext(loan.lender),
      ...getLoanContext(loan),
    },
    projectId: loan.lender.projectId,
  });

  // Revalidate the lender page
  revalidatePath(`/lenders/${data.lenderId}`);

  return { loan };
});
