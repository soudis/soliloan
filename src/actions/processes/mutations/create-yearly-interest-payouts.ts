'use server';

import { Entity, InterestPaymentType, Operation, PaymentType, TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createAuditEntry,
  getLenderContext,
  getLoanContext,
  getTransactionContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { invalidateDashboardWidgetResultsCache } from '@/lib/dashboard/widget-results-cache';
import { db } from '@/lib/db';
import { notifyLenderAboutTransaction } from '@/lib/email';
import {
  creditorGaps,
  groupPayoutRows,
  type PayoutGrouping,
  type PayoutRow,
  projectSepaGaps,
} from '@/lib/processes/payout-groups';
import { buildPain001Xml, type SepaRejectReason } from '@/lib/processes/sepa-credit-transfer';
import { payoutBookingDate, unpaidYearlyInterest } from '@/lib/processes/yearly-interest';
import { getLenderName } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';
import type { LoanWithRelations } from '@/types/loans';

const schema = z.object({
  projectId: z.string(),
  year: z.number().int(),
  loans: z.array(z.object({ loanId: z.string(), notify: z.boolean() })).min(1),
  sepa: z
    .object({
      grouping: z.enum(['lender', 'transaction']),
      executionDate: z.coerce.date(),
    })
    .nullable(),
});

export const createYearlyInterestPayoutsAction = projectAction
  .schema(schema)
  .action(async ({ parsedInput: { projectId, year, loans: requested, sepa } }) => {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        configuration: { select: { name: true, iban: true, bic: true, interestMethod: true } },
      },
    });

    if (!project) {
      throw new Error('error.project.notFound');
    }

    if (sepa) {
      const gaps = projectSepaGaps(project.configuration);
      if (gaps.length > 0) {
        throw new Error('error.serverError');
      }
    }

    const loanIds = requested.map((entry) => entry.loanId);
    const notifyByLoanId = new Map(requested.map((entry) => [entry.loanId, entry.notify]));

    const loadedLoans = await db.loan.findMany({
      where: {
        id: { in: loanIds },
        interestPaymentType: InterestPaymentType.YEARLY,
        lender: { projectId },
      },
      include: { lender: true, transactions: true },
    });
    const loansById = new Map(loadedLoans.map((loan) => [loan.id, loan]));

    const prepared: { loan: (typeof loadedLoans)[number]; unpaid: number; lenderName: string; row: PayoutRow }[] = [];
    const skipped: {
      loanId: string;
      loanNumber: number;
      lenderName: string;
      reasons: ('iban' | 'name' | SepaRejectReason)[];
    }[] = [];
    let emailsSent = 0;
    let emailsFailed = 0;
    let emailsSkipped = 0;

    for (const loanId of loanIds) {
      const loan = loansById.get(loanId);
      if (!loan) {
        continue;
      }
      const forCalculation = {
        ...loan,
        notes: [],
        files: [],
        lender: {
          ...loan.lender,
          notes: [],
          files: [],
          project: { configuration: { interestMethod: project.configuration.interestMethod } },
        },
      } as unknown as LoanWithRelations;

      const unpaid = unpaidYearlyInterest(forCalculation, year);
      if (unpaid <= 0) {
        continue;
      }

      const lenderName = getLenderName(loan.lender);
      const missing = creditorGaps({ iban: loan.lender.iban, lenderName });
      if (sepa && missing.length > 0) {
        skipped.push({ loanId: loan.id, loanNumber: loan.loanNumber, lenderName, reasons: missing });
        continue;
      }

      prepared.push({
        loan,
        unpaid,
        lenderName,
        row: {
          id: loan.id,
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          lenderId: loan.lender.id,
          lenderName,
          iban: loan.lender.iban,
          bic: loan.lender.bic,
          type: TransactionType.INTERESTPAYMENT,
          amount: unpaid,
          year,
        },
      });
    }

    let payable = prepared;
    let xml: string | null = null;
    if (
      sepa &&
      prepared.length > 0 &&
      project.configuration.iban &&
      project.configuration.bic &&
      project.configuration.name
    ) {
      const groups = groupPayoutRows(prepared.map((entry) => entry.row), sepa.grouping as PayoutGrouping, false);
      const credits = groups
        .filter((group) => group.missing.length === 0 && group.iban)
        .map((group) => ({
          group,
          credit: {
            endToEndId: group.rows.map((row) => row.id).join(''),
            creditorName: group.lenderName,
            iban: group.iban ?? '',
            bic: group.bic,
            amount: group.amount,
            remittance: group.purpose,
          },
        }));
      const built = buildPain001Xml({
        messageId: `ZL${year}${Date.now().toString(36)}`.slice(0, 35),
        debtorName: project.configuration.name,
        debtorIban: project.configuration.iban,
        debtorBic: project.configuration.bic,
        executionDate: sepa.executionDate,
        credits: credits.map((entry) => entry.credit),
      });
      xml = built.xml;
      const rejectedLoanIds = new Set<string>();
      for (const rejection of built.rejected) {
        const group = credits[rejection.index]?.group;
        if (!group) continue;
        for (const row of group.rows) {
          rejectedLoanIds.add(row.loanId);
          skipped.push({
            loanId: row.loanId,
            loanNumber: row.loanNumber,
            lenderName: row.lenderName,
            reasons: [rejection.reason],
          });
        }
      }
      payable = prepared.filter((entry) => !rejectedLoanIds.has(entry.loan.id));
    }

    const created: PayoutRow[] = [];
    for (const entry of payable) {
      const { loan, unpaid, lenderName } = entry;
      const transaction = await db.transaction.create({
        data: {
          type: TransactionType.INTERESTPAYMENT,
          date: payoutBookingDate(year),
          amount: -unpaid,
          paymentType: PaymentType.BANK,
          loanId: loan.id,
        },
      });

      await createAuditEntry(db, {
        entity: Entity.transaction,
        operation: Operation.CREATE,
        primaryKey: transaction.id,
        before: {},
        after: removeNullFields(transaction),
        context: {
          ...getLenderContext(loan.lender),
          ...getLoanContext(loan),
          ...getTransactionContext(transaction),
        },
        projectId,
      });

      const notify = notifyByLoanId.get(loan.id) ?? false;
      if (notify) {
        const result = await notifyLenderAboutTransaction({
          to: loan.lender.email,
          transactionId: transaction.id,
          projectId,
        });
        if (result === 'sent') emailsSent += 1;
        else if (result === 'failed') emailsFailed += 1;
        else emailsSkipped += 1;
      }

      created.push({
        id: transaction.id,
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        lenderId: loan.lender.id,
        lenderName,
        iban: loan.lender.iban,
        bic: loan.lender.bic,
        type: TransactionType.INTERESTPAYMENT,
        amount: unpaid,
        year,
      });

      revalidatePath(`/lenders/${loan.lenderId}`);
    }

    revalidatePath('/transactions/list');
    revalidatePath('/processes');
    invalidateDashboardWidgetResultsCache(projectId);

    return {
      createdCount: created.length,
      skipped,
      emailsSent,
      emailsFailed,
      emailsSkipped,
      xml,
    };
  });
