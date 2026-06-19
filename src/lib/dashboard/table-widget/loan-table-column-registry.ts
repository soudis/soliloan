import { ContractStatus } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';

import {
  buildLenderProfileColumnMeta,
  buildLenderProfileColumns,
} from '@/lib/dashboard/table-widget/lender-profile-columns';
import { getLenderSortValue } from '@/lib/dashboard/table-widget/lender-table-column-registry';
import {
  createAdditionalFieldsColumns,
  createCurrencyColumn,
  createDateColumn,
  createDurationDaysColumn,
  createEnumBadgeColumn,
  createNumberColumn,
  createPercentageColumn,
  createTerminationModalitiesColumn,
  formatTerminationModalities,
  withColumnGroup,
} from '@/lib/table-column-utils';
import type { LoanWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';

export type LoanTableColumnMeta = {
  id: string;
  labelKey: string | null;
  customLabel?: string;
  useLendersTranslations?: boolean;
};

const LOAN_TABLE_STATIC_COLUMN_META: { id: string; labelKey: string }[] = [
  { id: 'loanNumber', labelKey: 'table.loanNumber' },
  { id: 'signDate', labelKey: 'table.signDate' },
  { id: 'amount', labelKey: 'table.amount' },
  { id: 'balance', labelKey: 'table.balance' },
  { id: 'deposits', labelKey: 'table.deposits' },
  { id: 'withdrawals', labelKey: 'table.withdrawals' },
  { id: 'notReclaimed', labelKey: 'table.notReclaimed' },
  { id: 'interestRate', labelKey: 'table.interestRate' },
  { id: 'interest', labelKey: 'table.interest' },
  { id: 'interestPaid', labelKey: 'table.interestPaid' },
  { id: 'terminationType', labelKey: 'table.terminationType' },
  { id: 'terminationModalities', labelKey: 'table.terminationModalities' },
  { id: 'repayDate', labelKey: 'table.repayDate' },
  { id: 'loanTermDays', labelKey: 'table.loanTerm' },
  { id: 'repaymentPeriodDays', labelKey: 'table.repaymentPeriod' },
  { id: 'status', labelKey: 'table.status' },
  { id: 'altInterestMethod', labelKey: 'table.altInterestMethod' },
  { id: 'contractStatus', labelKey: 'table.contractStatus' },
];

const LOAN_COLUMN_GROUP = { key: 'loan' as const, order: 0 };
const LENDER_COLUMN_GROUP = { key: 'lender' as const, order: 1 };

export function buildLoanTableColumns(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
  durationT: (key: string, values?: Record<string, number>) => string,
): ColumnDef<LoanWithCalculations>[] {
  return [
    createNumberColumn<LoanWithCalculations>('loanNumber', 'table.loanNumber', t, locale),
    createDateColumn<LoanWithCalculations>('signDate', 'table.signDate', t, locale),
    createCurrencyColumn<LoanWithCalculations>('amount', 'table.amount', t, locale),
    createCurrencyColumn<LoanWithCalculations>('balance', 'table.balance', t, locale),
    createCurrencyColumn<LoanWithCalculations>('deposits', 'table.deposits', t, locale),
    createCurrencyColumn<LoanWithCalculations>('withdrawals', 'table.withdrawals', t, locale),
    createCurrencyColumn<LoanWithCalculations>('notReclaimed', 'table.notReclaimed', t, locale),
    createPercentageColumn<LoanWithCalculations>('interestRate', 'table.interestRate', t, locale),
    createCurrencyColumn<LoanWithCalculations>('interest', 'table.interest', t, locale),
    createCurrencyColumn<LoanWithCalculations>('interestPaid', 'table.interestPaid', t, locale),
    createEnumBadgeColumn<LoanWithCalculations>(
      'terminationType',
      'table.terminationType',
      'enums.loan.terminationType',
      t,
      commonT,
      () => 'outline',
    ),
    createTerminationModalitiesColumn<LoanWithCalculations>(t, commonT),
    createDateColumn<LoanWithCalculations>('repayDate', 'table.repayDate', t, locale),
    createDurationDaysColumn<LoanWithCalculations>('loanTermDays', 'table.loanTerm', t, durationT),
    createDurationDaysColumn<LoanWithCalculations>('repaymentPeriodDays', 'table.repaymentPeriod', t, durationT),
    createEnumBadgeColumn<LoanWithCalculations>('status', 'table.status', 'enums.loan.status', t, commonT, (value) => {
      switch (value) {
        case 'ACTIVE':
          return 'default';
        case 'TERMINATED':
          return 'destructive';
        case 'PENDING':
          return 'secondary';
        default:
          return 'outline';
      }
    }),
    createEnumBadgeColumn<LoanWithCalculations>(
      'altInterestMethod',
      'table.altInterestMethod',
      'enums.interestMethod',
      t,
      commonT,
      () => 'outline',
    ),
    createEnumBadgeColumn<LoanWithCalculations>(
      'contractStatus',
      'table.contractStatus',
      'enums.loan.contractStatus',
      t,
      commonT,
      (value) => {
        switch (value) {
          case ContractStatus.COMPLETED:
            return 'default';
          default:
            return 'outline';
        }
      },
    ),
    ...createAdditionalFieldsColumns<LoanWithCalculations>(
      project.configuration.loanAdditionalFields,
      'additionalFields',
      t,
      locale,
    ),
  ];
}

export function buildAllLoanTableColumns(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  tLenders: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
  durationT: (key: string, values?: Record<string, number>) => string,
): ColumnDef<LoanWithCalculations>[] {
  const loanColumns = buildLoanTableColumns(project, t, commonT, locale, durationT);

  const lenderProfileColumns = buildLenderProfileColumns<LoanWithCalculations>({
    getLender: (row) => row.lender,
    idPrefix: 'lender.',
    columnGroup: LENDER_COLUMN_GROUP,
    mode: 'full',
    project,
    t: tLenders,
    commonT,
    locale,
  });

  return [...withColumnGroup(loanColumns, LOAN_COLUMN_GROUP), ...lenderProfileColumns];
}

export function buildLoanTableColumnMeta(project: ProjectWithConfiguration): LoanTableColumnMeta[] {
  const additionalFieldMeta =
    project.configuration.loanAdditionalFields?.map((field) => ({
      id: `additionalFields.${field.id}`,
      labelKey: null,
      customLabel: field.name,
    })) ?? [];

  const lenderProfileMeta = buildLenderProfileColumnMeta(project, 'lender.').map((entry) => ({
    id: entry.id,
    labelKey: entry.labelKey.startsWith('table.') ? entry.labelKey : null,
    customLabel: entry.labelKey.startsWith('table.') ? undefined : entry.labelKey,
    useLendersTranslations: true,
  }));

  return [...LOAN_TABLE_STATIC_COLUMN_META, ...additionalFieldMeta, ...lenderProfileMeta];
}

function readNestedValue(row: LoanWithCalculations, field: string): unknown {
  if (field.startsWith('additionalFields.')) {
    const key = field.replace('additionalFields.', '');
    return row.additionalFields?.[key];
  }
  if (field.startsWith('lender.')) {
    const lenderField = field.replace('lender.', '');
    if (lenderField.startsWith('additionalFields.')) {
      const key = lenderField.replace('additionalFields.', '');
      return row.lender?.additionalFields?.[key];
    }
    return row.lender?.[lenderField as keyof typeof row.lender];
  }
  if (field.includes('.')) {
    const [root, ...rest] = field.split('.');
    let current: unknown = row[root as keyof LoanWithCalculations];
    for (const part of rest) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
  return row[field as keyof LoanWithCalculations];
}

export function getLoanSortValue(
  row: LoanWithCalculations,
  columnId: string,
  commonT: (key: string, values?: Record<string, string>) => string,
): string | number | Date | null {
  const normalizedId = columnId.startsWith('loan.') ? columnId.replace('loan.', '') : columnId;

  if (columnId.startsWith('lender.')) {
    const lenderField = columnId.replace('lender.', '');
    if (!row.lender) {
      return null;
    }
    return getLenderSortValue(row.lender, lenderField, commonT);
  }

  switch (normalizedId) {
    case 'terminationModalities':
      return formatTerminationModalities(row, commonT);
    case 'status':
      return commonT(`enums.loan.status.${row.status}`);
    case 'terminationType':
      return row.terminationType ? commonT(`enums.loan.terminationType.${row.terminationType}`) : '';
    case 'altInterestMethod':
      return row.altInterestMethod ? commonT(`enums.interestMethod.${row.altInterestMethod}`) : '';
    case 'contractStatus':
      return row.contractStatus ? commonT(`enums.loan.contractStatus.${row.contractStatus}`) : '';
    default: {
      const value = readNestedValue(row, normalizedId);
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        return value;
      }
      if (value == null) {
        return null;
      }
      return String(value);
    }
  }
}

export const LOAN_TABLE_COLUMN_IDS = [
  'loanNumber',
  'signDate',
  'amount',
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interestRate',
  'interest',
  'interestPaid',
  'terminationType',
  'terminationModalities',
  'repayDate',
  'loanTermDays',
  'repaymentPeriodDays',
  'status',
  'altInterestMethod',
  'contractStatus',
] as const;
