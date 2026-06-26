'use server';

import { db } from '@/lib/db';
import { updateImportRowSchema } from '@/lib/schemas/gocardless';
import { projectAction } from '@/lib/utils/safe-action';

export const updateImportRowAction = projectAction
  .inputSchema(updateImportRowSchema)
  .action(async ({ parsedInput: { projectId, rowId, selectedLenderId, selectedLoanId, selectedType } }) => {
    const row = await db.bankImportRow.findUnique({
      where: { id: rowId },
      include: { batch: true },
    });

    if (!row || row.batch.projectId !== projectId) {
      throw new Error('error.gocardless.importRowNotFound');
    }

    const data: {
      selectedLenderId?: string | null;
      selectedLoanId?: string | null;
      selectedType?: typeof selectedType;
    } = {};

    if (selectedLenderId !== undefined) {
      data.selectedLenderId = selectedLenderId;
      if (selectedLenderId === null) {
        data.selectedLoanId = null;
      } else if (row.selectedLoanId) {
        const loan = await db.loan.findUnique({
          where: { id: row.selectedLoanId },
          select: { lenderId: true },
        });
        if (!loan || loan.lenderId !== selectedLenderId) {
          data.selectedLoanId = null;
        }
      }
    }

    if (selectedLoanId !== undefined) {
      data.selectedLoanId = selectedLoanId;
    }

    if (selectedType !== undefined) {
      data.selectedType = selectedType;
    }

    const updated = await db.bankImportRow.update({
      where: { id: rowId },
      data,
    });

    return { row: updated };
  });
