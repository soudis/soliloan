'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getChangedFields, getLenderContext, getLoanContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { loanFormSchema } from '@/lib/schemas/loan';
import { loanAction } from '@/lib/utils/safe-action';

export const updateLoanAction = loanAction
  .inputSchema(
    z.object({
      loanId: z.string(),
      data: loanFormSchema,
    }),
  )
  .action(async ({ parsedInput: { loanId, data } }) => {
    // Fetch the loan

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

    // DEInvestmentActCompliance: update investmentTypeId based on interest rate
    let investmentTypeId: string | null | undefined;
    if (loan.lender.project.configuration.deInvestmentActCompliance) {
      const normalizedRate = normalizeLoanInterestRate(data.interestRate);
      const matchingType = await db.investmentType.findUnique({
        where: {
          projectId_interestRate: {
            projectId: loan.lender.projectId,
            interestRate: normalizedRate,
          },
        },
        select: { id: true },
      });
      investmentTypeId = matchingType?.id ?? null;
    }

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
        terminationPeriod: data.terminationPeriod,
        terminationPeriodType: data.terminationPeriodType,
        duration: data.duration,
        durationType: data.durationType,
        altInterestMethod: data.altInterestMethod,
        contractStatus: data.contractStatus,
        additionalFields: data.additionalFields ?? {},
        ...(investmentTypeId !== undefined && { investmentTypeId }),
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

    // Revalidate the lender page and loans page
    revalidatePath(`/lenders/${loan.lenderId}`);
    revalidatePath('/loans');

    return { loan: updatedLoan };
  });
