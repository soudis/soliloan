import type { ColumnDef, FilterFn, VisibilityState } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { dateRangeFilter } from '@/components/ui/data-table';
import {
  buildLenderProfileColumnMeta,
  buildLenderProfileColumns,
  buildLenderProfileDefaultColumnVisibility,
} from '@/lib/dashboard/table-widget/lender-profile-columns';
import { buildLoanTableColumns, getLoanSortValue } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import { getLenderSortValue } from '@/lib/dashboard/table-widget/lender-table-column-registry';
import {
  createColumn,
  createAdditionalFieldDefaultColumnVisibility,
  enumFilter,
  remapColumnsForNestedAccessor,
  withColumnGroup,
} from '@/lib/table-column-utils';
import { formatCurrency, resolveIntlLocaleForDates } from '@/lib/utils';
import type { LoanWithCalculations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';
import type { TransactionListItem } from '@/types/transactions';

export type TransactionTableColumnMeta = {
  id: string;
  labelKey: string | null;
  customLabel?: string;
  useLoansTranslations?: boolean;
  useLendersTranslations?: boolean;
};

const TRANSACTION_TABLE_STATIC_COLUMN_META: { id: string; labelKey: string }[] = [
  { id: 'transaction.type', labelKey: 'table.type' },
  { id: 'transaction.date', labelKey: 'table.date' },
  { id: 'transaction.amount', labelKey: 'table.amount' },
  { id: 'transaction.paymentType', labelKey: 'table.paymentType' },
];

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

const DEFAULT_VISIBLE_COLUMN_IDS = [
  'lender.lenderNumber',
  'lender.name',
  'loan.loanNumber',
  'transaction.type',
  'transaction.date',
  'transaction.amount',
] as const;

function getColumnId(column: ColumnDef<TransactionListItem>): string {
  if (column.id) {
    return column.id;
  }
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }
  return '';
}

function orderColumnsForDefaultDisplay(columns: ColumnDef<TransactionListItem>[]): ColumnDef<TransactionListItem>[] {
  const byId = new Map(columns.map((column) => [getColumnId(column), column]));
  const prioritySet = new Set<string>(DEFAULT_VISIBLE_COLUMN_IDS);
  const prioritized = DEFAULT_VISIBLE_COLUMN_IDS.map((id) => byId.get(id)).filter(
    (column): column is ColumnDef<TransactionListItem> => column !== undefined,
  );
  const rest = columns.filter((column) => !prioritySet.has(getColumnId(column)));
  return [...prioritized, ...rest];
}

export function buildTransactionTableDefaultColumnVisibility(project: ProjectWithConfiguration): VisibilityState {
  const transactionVisibility = Object.fromEntries(
    TRANSACTION_TABLE_STATIC_COLUMN_META.map(({ id }) => [id, id !== 'transaction.paymentType']),
  );

  const loanVisibility = Object.fromEntries(
    LOAN_TABLE_STATIC_COLUMN_META.map(({ id }) => [`loan.${id}`, id === 'loanNumber']),
  );

  return {
    ...transactionVisibility,
    ...loanVisibility,
    ...createAdditionalFieldDefaultColumnVisibility(
      'loan.additionalFields',
      project.configuration.loanAdditionalFields,
    ),
    ...buildLenderProfileDefaultColumnVisibility(project, 'lender.', ['lenderNumber', 'name']),
  };
}

const TRANSACTION_COLUMN_GROUP = { key: 'transaction' as const, order: 0 };
const LOAN_COLUMN_GROUP = { key: 'loan' as const, order: 1 };
const LENDER_COLUMN_GROUP = { key: 'lender' as const, order: 2 };

function transactionColumnId(field: string): string {
  return `transaction.${field}`;
}

function buildTransactionColumns<T extends TransactionListItem>(
  t: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
): ColumnDef<T>[] {
  const typeId = transactionColumnId('type');
  const dateId = transactionColumnId('date');
  const amountId = transactionColumnId('amount');
  const paymentTypeId = transactionColumnId('paymentType');

  const typeColumn = createColumn<T>(
    {
      id: typeId,
      accessorKey: typeId,
      header: 'table.type',
      accessorFn: (row) => row.type,
      cell: ({ row }) => {
        const value = row.original.type;
        if (!value) return '';
        return <Badge variant="outline">{commonT(`enums.transaction.type.${value}`)}</Badge>;
      },
      filterFn: enumFilter,
      meta: {
        export: {
          type: 'text',
          getValue: (row) => commonT(`enums.transaction.type.${(row as T).type}`),
        },
      },
    },
    t,
  );

  const dateColumn = createColumn<T>(
    {
      id: dateId,
      accessorKey: dateId,
      header: 'table.date',
      accessorFn: (row) => row.date.toISOString(),
      cell: ({ row }) => {
        const date = new Date(row.original.date);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString(resolveIntlLocaleForDates(locale), {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      },
      meta: {
        export: {
          type: 'date',
          getValue: (row) => new Date((row as T).date),
        },
      },
    },
    t,
  );
  dateColumn.filterFn = dateRangeFilter as FilterFn<T>;

  const amountColumn = createColumn<T>(
    {
      id: amountId,
      accessorKey: amountId,
      header: 'table.amount',
      align: 'right',
      accessorFn: (row: TransactionListItem) => row.amount,
      cell: ({ row }) => <div className="text-right tabular-nums">{formatCurrency(row.original.amount)}</div>,
      filterFn: 'inNumberRange',
      meta: {
        export: { type: 'currency' },
      },
    },
    t,
  );

  const paymentTypeColumn = createColumn<T>(
    {
      id: paymentTypeId,
      accessorKey: paymentTypeId,
      header: 'table.paymentType',
      accessorFn: (row) => row.paymentType,
      cell: ({ row }) => {
        const value = row.original.paymentType;
        if (!value) return '';
        return <Badge variant="outline">{commonT(`enums.transaction.paymentType.${value}`)}</Badge>;
      },
      filterFn: enumFilter,
      meta: {
        export: {
          type: 'text',
          getValue: (row) => commonT(`enums.transaction.paymentType.${(row as T).paymentType}`),
        },
      },
    },
    t,
  );

  return [typeColumn, dateColumn, amountColumn, paymentTypeColumn];
}

export function buildAllTransactionTableColumns(
  project: ProjectWithConfiguration,
  tTransactions: (key: string) => string,
  tLoans: (key: string) => string,
  tLenders: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
  durationT: (key: string, values?: Record<string, number>) => string,
): ColumnDef<TransactionListItem>[] {
  const transactionColumns = withColumnGroup(
    buildTransactionColumns<TransactionListItem>(tTransactions, commonT, locale),
    TRANSACTION_COLUMN_GROUP,
  );

  const loanColumns = withColumnGroup(
    remapColumnsForNestedAccessor<LoanWithCalculations, TransactionListItem>(
      buildLoanTableColumns(project, tLoans, commonT, locale, durationT),
      {
        idPrefix: 'loan.',
        getSource: (row) => row.loan,
      },
    ),
    LOAN_COLUMN_GROUP,
  );

  const lenderProfileColumns = buildLenderProfileColumns<TransactionListItem>({
    getLender: (row) => row.loan.lender,
    idPrefix: 'lender.',
    columnGroup: LENDER_COLUMN_GROUP,
    mode: 'full',
    project,
    t: tLenders,
    commonT,
    locale,
  });

  return orderColumnsForDefaultDisplay([...transactionColumns, ...loanColumns, ...lenderProfileColumns]);
}

export function buildTransactionTableColumnMeta(project: ProjectWithConfiguration): TransactionTableColumnMeta[] {
  const loanAdditionalFieldMeta =
    project.configuration.loanAdditionalFields?.map((field) => ({
      id: `loan.additionalFields.${field.id}`,
      labelKey: null,
      customLabel: field.name,
      useLoansTranslations: true,
    })) ?? [];

  const loanMeta = LOAN_TABLE_STATIC_COLUMN_META.map((entry) => ({
    id: `loan.${entry.id}`,
    labelKey: entry.labelKey,
    useLoansTranslations: true,
  }));

  const lenderProfileMeta = buildLenderProfileColumnMeta(project, 'lender.').map((entry) => ({
    id: entry.id,
    labelKey: entry.labelKey.startsWith('table.') ? entry.labelKey : null,
    customLabel: entry.labelKey.startsWith('table.') ? undefined : entry.labelKey,
    useLendersTranslations: true,
  }));

  return [
    ...TRANSACTION_TABLE_STATIC_COLUMN_META.map((entry) => ({
      ...entry,
      useLoansTranslations: false,
      useLendersTranslations: false,
    })),
    ...loanMeta,
    ...loanAdditionalFieldMeta,
    ...lenderProfileMeta,
  ];
}

export function getTransactionSortValue(
  row: TransactionListItem,
  columnId: string,
  commonT: (key: string, values?: Record<string, string>) => string,
): string | number | Date | null {
  if (columnId.startsWith('loan.')) {
    return getLoanSortValue(row.loan, columnId, commonT);
  }
  if (columnId.startsWith('lender.')) {
    const lenderField = columnId.replace('lender.', '');
    if (!row.loan.lender) {
      return null;
    }
    return getLenderSortValue(row.loan.lender, lenderField, commonT);
  }
  if (columnId.startsWith('transaction.')) {
    const field = columnId.replace('transaction.', '');
    switch (field) {
      case 'type':
        return commonT(`enums.transaction.type.${row.type}`);
      case 'paymentType':
        return commonT(`enums.transaction.paymentType.${row.paymentType}`);
      case 'date':
        return new Date(row.date);
      case 'amount':
        return row.amount;
      default:
        return null;
    }
  }
  return null;
}

export const TRANSACTION_TABLE_COLUMN_IDS = [
  'transaction.type',
  'transaction.date',
  'transaction.amount',
  'transaction.paymentType',
] as const;

export { DEFAULT_VISIBLE_COLUMN_IDS as DEFAULT_TRANSACTION_TABLE_VISIBLE_COLUMN_IDS };
