'use server';

import { TransactionType } from '@prisma/client';
import moment from 'moment';
import { z } from 'zod';

import { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import { loadProjectLoans } from '@/lib/loans/load-project-loans';
import { projectSepaGaps } from '@/lib/processes/payout-groups';
import { unpaidYearlyInterest } from '@/lib/processes/yearly-interest';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';
import type { LoanWithRelations } from '@/types/loans';

const schema = z.object({
  projectId: z.string(),
  year: z.number().int(),
});

export const getYearlyInterestPayoutAction = projectAction
  .schema(schema)
  .action(async ({ parsedInput: { projectId, year } }) => {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        configuration: { select: { name: true, iban: true, bic: true } },
      },
    });

    if (!project) {
      throw new Error('error.project.notFound');
    }

    const loans = await loadProjectLoans(projectId);

    let minYear = year;
    let payoutCount = 0;

    const rows = loans.flatMap((loan) => {
      for (const transaction of loan.transactions) {
        const transactionYear = moment(transaction.date).year();
        if (transactionYear < minYear) {
          minYear = transactionYear;
        }
        if (transaction.type === TransactionType.INTERESTPAYMENT && transactionYear === year) {
          payoutCount += 1;
        }
      }

      const parsed = parseAdditionalFields({
        ...loan,
        lender: parseAdditionalFields(loan.lender),
      });
      const unpaid = unpaidYearlyInterest(parsed as unknown as LoanWithRelations, year);
      if (unpaid <= 0) {
        return [];
      }

      return [
        {
          ...sanitizeLoan(calculateLoanFields(parsed)),
          unpaidYearlyInterest: unpaid,
        },
      ];
    });

    rows.sort((a, b) => a.loanNumber - b.loanNumber);

    const currentYear = moment().year();

    return {
      year,
      minYear: Math.min(minYear, currentYear),
      maxYear: currentYear,
      payoutCount,
      sepaGaps: projectSepaGaps(project.configuration),
      loans: rows,
    };
  });
