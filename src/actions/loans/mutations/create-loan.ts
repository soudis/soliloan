'use server';

import { type ContractStatus, type DurationType, Entity, type InterestMethod, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { LoanFormData } from '@/lib/schemas/loan';

export async function createLoan(data: LoanFormData) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if the user has access to the lender's project
    const lender = await db.lender.findUnique({
      where: {
        id: data.lenderId,
      },
      include: {
        project: {
          include: {
            managers: true,
          },
        },
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }

    // Check if the user has access to the project
    const hasAccess = lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this project');
    }

    // Create the loan
    const loan = await db.loan.create({
      data: {
        signDate: data.signDate as Date,
        terminationType: data.terminationType,
        endDate: data.endDate,
        terminationDate: data.terminationDate,
        terminationPeriod: Number(data.terminationPeriod),
        terminationPeriodType: data.terminationPeriodType as DurationType,
        duration: Number(data.duration),
        durationType: data.durationType as DurationType,
        amount: data.amount as number,
        interestRate: data.interestRate as number,
        altInterestMethod: data.altInterestMethod as InterestMethod,
        contractStatus: data.contractStatus as ContractStatus,
        additionalFields: data.additionalFields ?? {},
        lender: {
          connect: {
            id: data.lenderId,
          },
        },
      },
    });

    // Create audit trail entry
    await createAuditEntry(db, {
      entity: Entity.loan,
      operation: Operation.CREATE,
      primaryKey: loan.id,
      before: {},
      after: removeNullFields(loan),
      context: {
        ...getLenderContext(lender),
        ...getLoanContext(loan),
      },
      projectId: lender.project.id,
    });

    // Revalidate the loans page
    revalidatePath(`/lenders/${data.lenderId}`);

    return { loan };
  } catch (error) {
    console.error('Error creating loan:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create loan',
    };
  }
}
