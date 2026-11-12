import 'server-only';

import { Entity, Language, Operation, PaymentType, TransactionType } from '@prisma/client';

import { db } from '@/lib/db';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { getLenderName } from '@/lib/utils';

import { loadImportContextUnsafe } from './load-import-context';
import { importFileKind, parseImportFile, XLSX_MIME_TYPE } from './parse-file';
import type { ImportRowResult, ImportSettings, ImportSummary } from './types';
import { validateImport } from './validate';

const IMPORT_TRANSACTION_TIMEOUT_MS = 300_000;

/** A calendar date as the forms store it: local midnight. */
const toDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

const toDateOrNull = (isoDate: string | null) => (isoDate ? toDate(isoDate) : null);

/** Settings stored with an Import, plus the headers so the mapping can be restored onto the next file. */
export type StoredImportSettings = ImportSettings & { headers: string[] };

export type CommitImportResult =
  | { ok: true; importId: string; summary: ImportSummary }
  | { ok: false; reason: 'errors' | 'warnings'; summary: ImportSummary };

/**
 * Validates the file again against the current project and, if nothing blocks it, creates the Import with all its
 * Kreditgeber*innen, Kredite, opening Zahlungen and notes in one transaction (ADR 0011). The caller must have checked
 * that the user manages the project.
 */
export async function commitImportUnsafe(input: {
  projectId: string;
  user: { id: string; name: string };
  fileName: string;
  bytes: Uint8Array;
  settings: ImportSettings;
  acknowledgeWarnings: boolean;
}): Promise<CommitImportResult> {
  const { projectId, user, fileName, bytes, settings } = input;
  const [parsed, context, configuration] = await Promise.all([
    parseImportFile(fileName, bytes, settings.file),
    loadImportContextUnsafe(projectId),
    db.configuration.findFirst({ where: { project: { id: projectId } }, select: { userLanguage: true } }),
  ]);
  const result = validateImport(parsed.table, settings, context);
  const { summary } = result;
  if (summary.errors > 0) return { ok: false, reason: 'errors', summary };
  if (summary.warnings > 0 && !input.acknowledgeWarnings) return { ok: false, reason: 'warnings', summary };

  const lenderGroups = new Map<string, ImportRowResult[]>();
  for (const row of result.rows) {
    lenderGroups.set(row.lenderGroup, [...(lenderGroups.get(row.lenderGroup) ?? []), row]);
  }
  const lenders = [...lenderGroups.values()].flatMap((group) => (group[0]?.lender ? [group[0].lender] : []));
  const rows = result.rows.filter((row) => row.lender && row.loan && row.opening);
  const language = configuration?.userLanguage ?? Language.de;
  const storedSettings: StoredImportSettings = { ...settings, headers: parsed.table.headers };

  const importId = await db.$transaction(
    async (tx) => {
      // Numbers were free when validating; make sure no one took them since.
      const [takenLenders, takenLoans] = await Promise.all([
        tx.lender.count({ where: { projectId, lenderNumber: { in: lenders.map((lender) => lender.lenderNumber) } } }),
        tx.loan.count({
          where: { lender: { projectId }, loanNumber: { in: rows.map((row) => row.loan?.loanNumber ?? 0) } },
        }),
      ]);
      if (takenLenders > 0 || takenLoans > 0) throw new Error('error.import.numbersTaken');

      // Kreditgeber*innen with an email are linked to a user account; create the missing ones, invite no one.
      const emails = [...new Set(lenders.flatMap((lender) => (lender.email ? [lender.email] : [])))];
      const existingUsers = await tx.user.findMany({ where: { email: { in: emails } }, select: { email: true } });
      const existingEmails = new Set(existingUsers.map((entry) => entry.email));
      const newUsers = lenders.filter(
        (lender, index) =>
          lender.email &&
          !existingEmails.has(lender.email) &&
          lenders.findIndex((other) => other.email === lender.email) === index,
      );
      const createdUsers = await tx.user.createManyAndReturn({
        data: newUsers.map((lender) => ({ email: lender.email, name: getLenderName(lender), language })),
        select: { id: true },
      });

      const created = await tx.import.create({
        data: {
          projectId,
          fileName,
          fileMimeType: importFileKind(fileName) === 'xlsx' ? XLSX_MIME_TYPE : 'text/csv',
          fileData: new Uint8Array(bytes),
          settings: storedSettings,
          summary,
          createdUserIds: createdUsers.map((entry) => entry.id),
          createdById: user.id,
        },
        select: { id: true },
      });

      const createdLenders = await tx.lender.createManyAndReturn({
        data: lenders.map(({ additionalFields, ...lender }) => ({
          ...lender,
          additionalFields,
          projectId,
          importId: created.id,
        })),
        select: { id: true, lenderNumber: true },
      });
      const lenderIdByNumber = new Map(createdLenders.map((entry) => [entry.lenderNumber, entry.id]));
      const lenderIdOf = (row: ImportRowResult) => lenderIdByNumber.get(row.lender?.lenderNumber ?? 0) ?? '';

      const investmentTypes = await tx.investmentType.findMany({
        where: { projectId },
        select: { id: true, interestRate: true },
      });
      const investmentTypeIdByRate = new Map(
        investmentTypes.map((type) => [normalizeLoanInterestRate(type.interestRate), type.id]),
      );

      const createdLoans = await tx.loan.createManyAndReturn({
        data: rows.map((row) => {
          const loan = row.loan as NonNullable<ImportRowResult['loan']>;
          return {
            loanNumber: loan.loanNumber,
            lenderId: lenderIdOf(row),
            signDate: toDate(loan.signDate),
            amount: loan.amount,
            interestRate: loan.interestRate,
            interestPaymentType: loan.interestPaymentType,
            altInterestMethod: loan.interestMethod === context.interestMethod ? null : loan.interestMethod,
            contractStatus: loan.contractStatus,
            terminationType: loan.terminationType,
            endDate: toDateOrNull(loan.endDate),
            terminationDate: toDateOrNull(loan.terminationDate),
            terminationPeriod: loan.terminationPeriod,
            terminationPeriodType: loan.terminationPeriodType,
            duration: loan.duration,
            durationType: loan.durationType,
            additionalFields: loan.additionalFields,
            investmentTypeId:
              loan.investmentTypeRate === null ? null : (investmentTypeIdByRate.get(loan.investmentTypeRate) ?? null),
            importId: created.id,
          };
        }),
        select: { id: true, loanNumber: true },
      });
      const loanIdByNumber = new Map(createdLoans.map((entry) => [entry.loanNumber, entry.id]));
      const loanIdOf = (row: ImportRowResult) => loanIdByNumber.get(row.loan?.loanNumber ?? 0) ?? '';

      await tx.transaction.createMany({
        data: rows.flatMap((row) => {
          const opening = row.opening as NonNullable<ImportRowResult['opening']>;
          const base = { loanId: loanIdOf(row), date: toDate(opening.stichtag), paymentType: PaymentType.OTHER };
          return [
            ...(opening.einlagenstand > 0
              ? [{ ...base, type: TransactionType.DEPOSIT, amount: opening.einlagenstand, importId: created.id }]
              : []),
            ...(opening.zinsuebertrag > 0
              ? [
                  {
                    ...base,
                    type: TransactionType.INTERESTCARRYOVER,
                    amount: opening.zinsuebertrag,
                    importId: created.id,
                  },
                ]
              : []),
          ];
        }),
      });

      const now = new Date();
      const noteBase = { public: false, createdById: user.id, createdAt: now, importId: created.id };
      const lenderNotes = [...lenderGroups.values()].flatMap((group) => {
        const lenderId = group[0] ? lenderIdOf(group[0]) : '';
        const texts = [...new Set(group.flatMap((row) => (row.lenderNote ? [row.lenderNote] : [])))];
        return texts.map((text) => ({ ...noteBase, text, lenderId, loanId: null }));
      });
      const loanNotes = rows.flatMap((row) =>
        row.loanNote ? [{ ...noteBase, text: row.loanNote, lenderId: lenderIdOf(row), loanId: loanIdOf(row) }] : [],
      );
      await tx.note.createMany({ data: [...lenderNotes, ...loanNotes] });

      await tx.change.create({
        data: {
          entity: Entity.import,
          operation: Operation.CREATE,
          primaryKey: created.id,
          projectId,
          before: {},
          after: { fileName, lenders: summary.lenders, loans: summary.loans, totals: summary.totals },
          context: { user, import: { id: created.id, fileName } },
          committedAt: now,
        },
      });

      return created.id;
    },
    { timeout: IMPORT_TRANSACTION_TIMEOUT_MS, maxWait: 10_000 },
  );

  return { ok: true, importId, summary };
}
