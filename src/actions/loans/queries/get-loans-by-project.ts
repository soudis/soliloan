'use server';

import { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import { loadProjectLoans } from '@/lib/loans/load-project-loans';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { projectIdSchema } from '@/lib/schemas/common';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

export async function getLoansByProjectUnsafe(projectId: string) {
  try {
    const loans = await loadProjectLoans(projectId);

    // Calculate virtual fields for each loan
    const loansWithCalculations = loans.map((loan) =>
      sanitizeLoan(calculateLoanFields(parseAdditionalFields({ ...loan, lender: parseAdditionalFields(loan.lender) }))),
    );

    return { loans: loansWithCalculations };
  } catch (error) {
    console.error('Error fetching loans:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch loans',
    };
  }
}

export const getLoansByProjectAction = projectAction.inputSchema(projectIdSchema).action(async ({ parsedInput }) => {
  return getLoansByProjectUnsafe(parsedInput.projectId);
});
