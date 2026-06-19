import { ContractStatus } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';

import {
  createAdditionalFieldsColumns,
  createColumn,
  createCurrencyColumn,
  createDateColumn,
  createDurationDaysColumn,
  createEnumBadgeColumn,
  createLenderColumn,
  createNumberColumn,
  createPercentageColumn,
  createTerminationModalitiesColumn,
  formatTerminationModalities,
} from '@/lib/table-column-utils';
import type { LoanWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';

export type LoanTableColumnMeta = {
  id: string;
  labelKey: string | null;
  customLabel?: string;
};

const LOAN_TABLE_STATIC_COLUMN_META: { id: string; labelKey: string }[] = [
  { id: 'loanNumber', labelKey: 'table.loanNumber' },
  { id: 'lenderNumber', labelKey: 'table.lenderNumber' },
  { id: 'signDate', labelKey: 'table.signDate' },
  { id: 'lenderName', labelKey: 'table.lenderName' },
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

export function buildAllLoanTableColumns(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
  durationT: (key: string, values?: Record<string, number>) => string,
): ColumnDef<LoanWithCalculations>[] {
  return [
    createNumberColumn<LoanWithCalculations>('loanNumber', 'table.loanNumber', t, locale),

    createColumn<LoanWithCalculations>(
      {
        accessorKey: 'lenderNumber',
        header: 'table.lenderNumber',
        accessorFn: (row: LoanWithCalculations) => row.lender?.lenderNumber,
        cell: ({ row }) => {
          const value = row.original.lender?.lenderNumber || 0;
          return value.toFixed(0);
        },
        meta: {
          export: { type: 'integer' },
        },
      },
      t,
    ),

    createDateColumn<LoanWithCalculations>('signDate', 'table.signDate', t, locale),

    createLenderColumn<LoanWithCalculations>(t),

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

export function buildLoanTableColumnMeta(project: ProjectWithConfiguration): LoanTableColumnMeta[] {
  const additionalFieldMeta =
    project.configuration.loanAdditionalFields?.map((field) => ({
      id: `additionalFields.${field.id}`,
      labelKey: null,
      customLabel: field.name,
    })) ?? [];

  return [...LOAN_TABLE_STATIC_COLUMN_META, ...additionalFieldMeta];
}

function readNestedValue(row: LoanWithCalculations, field: string): unknown {
  if (field.startsWith('additionalFields.')) {
    const key = field.replace('additionalFields.', '');
    return row.additionalFields?.[key];
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
  switch (columnId) {
    case 'lenderNumber':
      return row.lender?.lenderNumber ?? null;
    case 'lenderName': {
      const lender = row.lender;
      if (lender.organisationName) {
        return lender.organisationName;
      }
      return `${lender.firstName || ''} ${lender.lastName || ''}`.trim();
    }
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
      const value = readNestedValue(row, columnId);
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
  'lenderNumber',
  'signDate',
  'lenderName',
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
