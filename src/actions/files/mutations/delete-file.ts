'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import {
  createAuditEntry,
  getFileContext,
  getLenderContext,
  getLoanContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function deleteFile(fileId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const file = await db.file.findUnique({
      where: {
        id: fileId,
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
        loan: true,
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    const lender = file.lender;
    if (!lender) {
      throw new Error('Lender not found');
    }

    // Check if the user has access to the loan's project
    const hasAccess = session.user.isAdmin || lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this file');
    }

    // Create audit trail entry before deletion
    const fileForAudit = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      public: file.public,
      description: file.description,
      lenderId: file.lenderId,
      loanId: file.loanId,
    };

    await createAuditEntry(db, {
      entity: Entity.file,
      operation: Operation.DELETE,
      primaryKey: fileId,
      before: removeNullFields(fileForAudit),
      after: {},
      context: {
        ...getLenderContext(lender),
        ...(file.loan && getLoanContext(file.loan)),
        ...getFileContext(file),
      },
      projectId: lender.project.id,
    });

    // Delete the file
    await db.file.delete({
      where: {
        id: fileId,
      },
    });

    // Revalidate the loan page
    revalidatePath(`/lenders/${lender.id}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}
