'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function deleteLoan(loanId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'auth.unauthorized' };
    }

    // Fetch the loan with lender and project context
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                managers: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      return { error: 'loan.notFound' };
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      return { error: 'auth.forbidden' };
    }

    // Create audit trail entry before deletion
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
      projectId: loan.lender.project.id,
    });

    // Delete the loan
    await db.loan.delete({
      where: {
        id: loanId,
      },
    });

    // Revalidate relevant paths
    revalidatePath(`/${loan.lender.project.id}/lenders/${loan.lenderId}`);
    revalidatePath(`/${loan.lender.project.id}/loans`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting loan:', error);
    return {
      error: 'loan.deleteFailed', // Generic error key
    };
  }
}
