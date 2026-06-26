'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { loanFormSchema } from '@/lib/schemas/loan';
import { lenderAction } from '@/lib/utils/safe-action';

async function getNextLoanNumber(projectId: string): Promise<number> {
  const result = await db.loan.aggregate({
    where: { lender: { projectId } },
    _max: { loanNumber: true },
  });
  return (result._max.loanNumber ?? 0) + 1;
}

export const createLoanAction = lenderAction.inputSchema(loanFormSchema).action(async ({ parsedInput: data }) => {
  const lender = await db.lender.findUniqueOrThrow({
    where: { id: data.lenderId },
    select: {
      country: true,
      projectId: true,
      project: {
        select: {
          configuration: {
            select: { deInvestmentActCompliance: true },
          },
        },
      },
    },
  });

  const loanNumber = data.loanNumber ?? (await getNextLoanNumber(lender.projectId));

  if (data.loanNumber) {
    const existing = await db.loan.findFirst({
      where: { loanNumber: data.loanNumber, lender: { projectId: lender.projectId } },
      select: { id: true },
    });
    if (existing) return { fieldErrors: { loanNumber: 'error.loan.numberAlreadyExists' } };
  }

  // DEInvestmentActCompliance: German lenders must use an existing matching InvestmentType.
  let investmentTypeId: string | undefined;

  if (lender.project.configuration.deInvestmentActCompliance && lender.country === 'DE') {
    const normalizedRate = normalizeLoanInterestRate(data.interestRate);
    const matchingType = await db.investmentType.findUnique({
      where: {
        projectId_interestRate: {
          projectId: lender.projectId,
          interestRate: normalizedRate,
        },
      },
      select: { id: true },
    });

    if (!matchingType) {
      return { formErrors: { investmentType: 'error.loan.investmentTypeRequired' } };
    }

    investmentTypeId = matchingType.id;
  }

  const loan = await db.loan.create({
    data: {
      lender: {
        connect: {
          id: data.lenderId,
        },
      },
      loanNumber,
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
      ...(investmentTypeId && { investmentType: { connect: { id: investmentTypeId } } }),
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

  // Revalidate the lender page and loans page
  revalidatePath(`/lenders/${data.lenderId}`);
  revalidatePath('/loans');

  return { loan };
});
