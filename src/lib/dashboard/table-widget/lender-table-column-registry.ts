import type { ColumnDef } from '@tanstack/react-table';

import {
  accessorKeyToColumnId,
  createAdditionalFieldsColumns,
  createColumn,
  createCurrencyColumn,
  createLenderAddressColumn,
  createLenderBankingColumn,
  createLenderEnumBadgeColumn,
  createLenderNameColumn,
} from '@/lib/table-column-utils';
import { getLenderName } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import type { ProjectWithConfiguration } from '@/types/projects';

export type LenderTableColumnMeta = {
  id: string;
  labelKey: string | null;
  customLabel?: string;
};

function resolveColumnId(column: ColumnDef<LenderWithCalculations>): string {
  if (column.id) {
    return column.id;
  }
  const accessorKey = 'accessorKey' in column ? column.accessorKey : undefined;
  if (typeof accessorKey === 'string') {
    return accessorKeyToColumnId(accessorKey);
  }
  return '';
}

export function buildAllLenderTableColumns(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  tLoans: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
): ColumnDef<LenderWithCalculations>[] {
  return [
    createColumn<LenderWithCalculations>(
      {
        accessorKey: 'lenderNumber',
        header: 'table.lenderNumber',
      },
      t,
    ),

    createLenderNameColumn<LenderWithCalculations>(t),

    createLenderEnumBadgeColumn<LenderWithCalculations>(
      'type',
      'table.type',
      'enums.lender.type',
      t,
      commonT,
      () => 'outline',
    ),

    createColumn<LenderWithCalculations>(
      {
        accessorKey: 'email',
        header: 'table.email',
      },
      t,
    ),

    createColumn<LenderWithCalculations>(
      {
        accessorKey: 'telNo',
        header: 'table.telNo',
      },
      t,
    ),

    createLenderAddressColumn<LenderWithCalculations>(t),

    createLenderBankingColumn<LenderWithCalculations>(t),

    createLenderEnumBadgeColumn<LenderWithCalculations>(
      'salutation',
      'table.salutation',
      'enums.lender.salutation',
      t,
      commonT,
      () => 'outline',
    ),

    createLenderEnumBadgeColumn<LenderWithCalculations>(
      'notificationType',
      'table.notificationType',
      'enums.lender.notificationType',
      t,
      commonT,
      () => 'outline',
    ),

    ...createAdditionalFieldsColumns<LenderWithCalculations>(
      project.configuration.lenderAdditionalFields,
      'additionalFields',
      t,
      locale,
    ),

    createCurrencyColumn<LenderWithCalculations>('amount', 'table.amount', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('balance', 'table.balance', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('deposits', 'table.deposits', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('withdrawals', 'table.withdrawals', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('notReclaimed', 'table.notReclaimed', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('interest', 'table.interest', tLoans, locale),

    createCurrencyColumn<LenderWithCalculations>('interestPaid', 'table.interestPaid', tLoans, locale),
  ];
}

export function buildLenderTableColumnMeta(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  tLoans: (key: string) => string,
  commonT: (key: string) => string,
  locale: string,
): LenderTableColumnMeta[] {
  const columns = buildAllLenderTableColumns(project, t, tLoans, commonT, locale);

  return columns.map((column) => {
    const id = resolveColumnId(column);
    const config = column as ColumnDef<LenderWithCalculations> & { header?: string };
    const headerKey = typeof config.header === 'string' ? config.header : null;

    const additionalField = project.configuration.lenderAdditionalFields?.find(
      (field) => id === `additionalFields.${field.id}`,
    );

    let resolvedLabelKey = headerKey;
    if (id === 'amount' || id === 'balance' || id === 'deposits' || id === 'withdrawals' || id === 'notReclaimed' || id === 'interest' || id === 'interestPaid') {
      resolvedLabelKey = `table.${id}`;
    }

    return {
      id,
      labelKey: additionalField ? null : resolvedLabelKey,
      customLabel: additionalField?.name,
    };
  });
}

function readNestedValue(row: LenderWithCalculations, field: string): unknown {
  if (field.startsWith('additionalFields.')) {
    const key = field.replace('additionalFields.', '');
    return row.additionalFields?.[key];
  }
  return row[field as keyof LenderWithCalculations];
}

export function getLenderSortValue(
  row: LenderWithCalculations,
  columnId: string,
  commonT: (key: string) => string,
): string | number | null {
  switch (columnId) {
    case 'name':
      return getLenderName(row);
    case 'address': {
      const street = row.street || '';
      const addon = row.addon ? `, ${row.addon}` : '';
      const zip = row.zip || '';
      const place = row.place || '';
      const country = row.country || '';
      if (!street && !zip && !place && !country) {
        return '';
      }
      return `${street}${addon} ${zip} ${place} ${country}`.trim();
    }
    case 'banking': {
      const iban = row.iban || '';
      const bic = row.bic || '';
      if (!iban && !bic) {
        return '';
      }
      return `${iban} ${bic}`.trim();
    }
    case 'type':
      return row.type ? commonT(`enums.lender.type.${row.type}`) : '';
    case 'salutation':
      return row.salutation ? commonT(`enums.lender.salutation.${row.salutation}`) : '';
    case 'notificationType':
      return row.notificationType ? commonT(`enums.lender.notificationType.${row.notificationType}`) : '';
    default: {
      const value = readNestedValue(row, columnId);
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

export const LENDER_TABLE_COLUMN_IDS = [
  'lenderNumber',
  'name',
  'type',
  'email',
  'telNo',
  'address',
  'banking',
  'salutation',
  'notificationType',
  'amount',
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interest',
  'interestPaid',
] as const;
