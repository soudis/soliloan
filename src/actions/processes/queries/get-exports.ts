'use server';

import moment from 'moment';
import { z } from 'zod';

import { listExportsUnsafe, loadExportLoansUnsafe } from '@/lib/exports/generate-export';
import { countOpenYearlyInterest } from '@/lib/processes/yearly-interest';
import { projectAction } from '@/lib/utils/safe-action';

export const getExportsAction = projectAction
  .schema(z.object({ projectId: z.string() }))
  .action(async ({ parsedInput: { projectId } }) => {
    const exports = await listExportsUnsafe(projectId);
    return {
      exports: exports.map((entry) => ({
        ...entry,
        createdBy: entry.createdBy.name || entry.createdBy.email,
      })),
    };
  });

/** What the Downloads tab needs to know about one year before generating: the year range and open Zinsauszahlungen. */
export const getExportYearAction = projectAction
  .schema(z.object({ projectId: z.string(), year: z.number().int() }))
  .action(async ({ parsedInput: { projectId, year } }) => {
    const loans = await loadExportLoansUnsafe(projectId);
    const currentYear = moment().year();
    const firstYear = Math.min(
      currentYear - 1,
      ...loans.flatMap((loan) => loan.transactions.map((transaction) => moment(transaction.date).year())),
    );
    return {
      year,
      minYear: firstYear,
      maxYear: currentYear,
      openYearlyInterest: countOpenYearlyInterest(loans, year),
    };
  });
