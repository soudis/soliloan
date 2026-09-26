'use server';

import { InterestPaymentType, TransactionType } from '@prisma/client';
import moment from 'moment';
import { z } from 'zod';

import { db } from '@/lib/db';
import { projectSepaGaps } from '@/lib/processes/payout-groups';
import { unpaidYearlyInterest } from '@/lib/processes/yearly-interest';
import { getLenderName } from '@/lib/utils';
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
        configuration: { select: { name: true, iban: true, bic: true, interestMethod: true } },
      },
    });

    if (!project) {
      throw new Error('error.project.notFound');
    }

    const loans = await db.loan.findMany({
      where: {
        interestPaymentType: InterestPaymentType.YEARLY,
        lender: { projectId },
      },
      include: {
        lender: true,
        transactions: true,
      },
    });

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

      const forCalculation = {
        ...loan,
        notes: [],
        files: [],
        lender: {
          ...loan.lender,
          notes: [],
          files: [],
          project: {
            configuration: {
              interestMethod: project.configuration.interestMethod,
            },
          },
        },
      } as unknown as LoanWithRelations;

      const unpaid = unpaidYearlyInterest(forCalculation, year);
      if (unpaid <= 0) {
        return [];
      }

      return [
        {
          id: loan.id,
          loanNumber: loan.loanNumber,
          interestRate: loan.interestRate,
          unpaid,
          lender: {
            id: loan.lender.id,
            name: getLenderName(loan.lender),
            email: loan.lender.email,
            iban: loan.lender.iban,
            bic: loan.lender.bic,
            street: loan.lender.street,
            addon: loan.lender.addon,
            zip: loan.lender.zip,
            place: loan.lender.place,
            country: loan.lender.country,
          },
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
