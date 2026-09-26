'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { groupPayoutRows, isOutboundSepaType, type PayoutRow, projectSepaGaps } from '@/lib/processes/payout-groups';
import { buildPain001Xml, type SepaRejectReason } from '@/lib/processes/sepa-credit-transfer';
import { transactionCalendarYear } from '@/lib/processes/yearly-interest';
import { getLenderName } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';

const schema = z.object({
  projectId: z.string(),
  transactionIds: z.array(z.string()).min(1),
  grouping: z.enum(['lender', 'transaction']),
  executionDate: z.coerce.date(),
});

export const buildOutboundSepaAction = projectAction
  .schema(schema)
  .action(async ({ parsedInput: { projectId, transactionIds, grouping, executionDate } }) => {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { configuration: { select: { name: true, iban: true, bic: true } } },
    });

    if (!project) {
      throw new Error('error.project.notFound');
    }

    const gaps = projectSepaGaps(project.configuration);
    if (gaps.length > 0 || !project.configuration.iban || !project.configuration.bic || !project.configuration.name) {
      throw new Error('error.serverError');
    }

    const loaded = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        loan: { lender: { projectId } },
      },
      include: { loan: { include: { lender: true } } },
    });
    const byId = new Map(loaded.map((transaction) => [transaction.id, transaction]));

    const rows: PayoutRow[] = [];
    for (const transactionId of transactionIds) {
      const transaction = byId.get(transactionId);
      if (!transaction) {
        continue;
      }
      if (!isOutboundSepaType(transaction.type)) {
        throw new Error('error.serverError');
      }
      rows.push({
        id: transaction.id,
        loanId: transaction.loanId,
        loanNumber: transaction.loan.loanNumber,
        lenderId: transaction.loan.lender.id,
        lenderName: getLenderName(transaction.loan.lender),
        iban: transaction.loan.lender.iban,
        bic: transaction.loan.lender.bic,
        type: transaction.type,
        amount: Math.abs(transaction.amount),
        year: transactionCalendarYear(transaction.date),
      });
    }

    const groups = groupPayoutRows(rows, grouping, true);
    const ready = groups.filter((group) => group.missing.length === 0 && group.iban && group.amount > 0);
    const skipped: {
      lenderName: string;
      loanNumbers: number[];
      reasons: ('iban' | 'name' | SepaRejectReason)[];
    }[] = groups
      .filter((group) => group.missing.length > 0)
      .map((group) => ({
        lenderName: group.lenderName,
        loanNumbers: [...new Set(group.rows.map((row) => row.loanNumber))],
        reasons: group.missing,
      }));

    const built =
      ready.length === 0
        ? { xml: null, rejected: [] }
        : buildPain001Xml({
            messageId: `AZ${Date.now().toString(36)}`.slice(0, 35),
            debtorName: project.configuration.name,
            debtorIban: project.configuration.iban,
            debtorBic: project.configuration.bic,
            executionDate,
            credits: ready.map((group) => ({
              endToEndId: group.rows.map((row) => row.id).join(''),
              creditorName: group.lenderName,
              iban: group.iban ?? '',
              bic: group.bic,
              amount: group.amount,
              remittance: group.purpose,
            })),
          });

    for (const rejection of built.rejected) {
      const group = ready[rejection.index];
      if (!group) continue;
      skipped.push({
        lenderName: group.lenderName,
        loanNumbers: [...new Set(group.rows.map((row) => row.loanNumber))],
        reasons: [rejection.reason],
      });
    }

    return { xml: built.xml, skipped };
  });
