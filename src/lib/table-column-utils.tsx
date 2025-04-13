import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import { formatCurrency } from '@/lib/utils'
import { ColumnDef } from '@tanstack/react-table'
import React from 'react'

// Define the custom filter function for compound text fields
export const compoundTextFilter = (row: any, columnId: string, filterValue: any) => {
  const value = row.getValue(columnId);
  if (!value) return false;

  // Convert both the value and filter to lowercase for case-insensitive search
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();

  return searchValue.includes(searchFilter);
};

// Define the custom filter function type
export type FilterFn = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'compoundText'

// Generic type for creating column definitions
export type ColumnConfig<T> = {
  accessorKey: string
  header: string
  cell?: (row: any) => React.ReactNode
  accessorFn?: (row: T) => any
  filterFn?: any
  sortingFn?: (rowA: any, rowB: any, columnId: string) => number
  id?: string
}

// Create a basic column definition
export function createColumn<T>(
  config: ColumnConfig<T>,
  t: (key: string) => string
): ColumnDef<T> {
  return {
    accessorKey: config.accessorKey,
    id: config.id,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t(config.header)} />
    ),
    cell: config.cell,
    accessorFn: config.accessorFn,
    filterFn: config.filterFn,
    sortingFn: config.sortingFn || ((rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId);
      const b = rowB.getValue(columnId);
      if (a === b) return 0;
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      return a < b ? -1 : 1;
    }),
  }
}

// Create a currency column
export function createCurrencyColumn<T>(
  accessorKey: string,
  headerKey: string,
  t: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey,
    header: headerKey,
    cell: ({ row }) => {
      const value = Number(row.getValue(accessorKey)) || 0
      return formatCurrency(value)
    }
  }, t)
}

// Create a date column
export function createDateColumn<T>(
  accessorKey: string,
  headerKey: string,
  t: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey,
    header: headerKey,
    cell: ({ row }) => {
      const dateStr = row.getValue(accessorKey) as string
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE')
      } catch (e) {
        return ''
      }
    }
  }, t)
}

// Create a percentage column
export function createPercentageColumn<T>(
  accessorKey: string,
  headerKey: string,
  t: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey,
    header: headerKey,
    cell: ({ row }) => {
      const value = Number(row.getValue(accessorKey)) || 0
      return `${value.toFixed(2)}%`
    }
  }, t)
}

// Create an enum column with badge
export function createEnumBadgeColumn<T>(
  accessorKey: string,
  headerKey: string,
  enumPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
  getBadgeVariant?: (value: string) => "default" | "secondary" | "destructive" | "outline"
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey,
    header: headerKey,
    cell: ({ row }) => {
      const value = row.getValue(accessorKey) as string
      if (!value) return ''

      const enumText = commonT(`${enumPrefix}.${value}`)

      // Define badge variant based on status
      let variant: "default" | "secondary" | "destructive" | "outline" = "default"

      if (getBadgeVariant) {
        variant = getBadgeVariant(value)
      }

      return (
        <Badge variant={variant} >
          {enumText}
        </Badge>
      )
    },
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    }
  }, t)
}

// Create a lender name column
export function createLenderColumn<T>(
  t: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey: 'lender',
    header: 'table.lender',
    accessorFn: (row: any) => {
      const lender = row.lender
      if (lender.organisationName) {
        return lender.organisationName
      }
      return `${lender.firstName || ''} ${lender.lastName || ''}`.trim()
    },
    cell: ({ row }) => {
      const lender = row.original.lender
      if (lender.organisationName) {
        return lender.organisationName
      }
      return `${lender.firstName || ''} ${lender.lastName || ''}`.trim()
    },
    filterFn: compoundTextFilter,
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    },
  }, t)
}

// Create a termination modalities column
export function createTerminationModalitiesColumn<T>(
  t: (key: string) => string,
  commonT: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    id: 'terminationModalities',
    accessorKey: 'terminationModalities',
    header: 'table.terminationModalities',
    accessorFn: (row: any) => {
      const terminationType = row.terminationType

      if (terminationType === 'ENDDATE' && row.endDate) {
        try {
          const date = new Date(row.endDate)
          return isNaN(date.getTime()) ? '' : date.getTime() // Sort by timestamp
        } catch (e) {
          return 0
        }
      } else if (terminationType === 'DURATION' && row.duration) {
        // Convert everything to months for consistent sorting
        const monthMultiplier = row.durationType === 'YEARS' ? 12 : 1
        return row.duration * monthMultiplier
      } else if (terminationType === 'TERMINATION' && row.terminationPeriod) {
        // Convert everything to months for consistent sorting
        const monthMultiplier = row.terminationPeriodType === 'YEARS' ? 12 : 1
        return row.terminationPeriod * monthMultiplier
      }

      return 0
    },
    cell: ({ row }) => {
      const loan = row.original
      const terminationType = loan.terminationType

      if (terminationType === 'ENDDATE' && loan.endDate) {
        try {
          const date = new Date(loan.endDate)
          const formattedDate = isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE')
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${formattedDate}`
        } catch (e) {
          return commonT(`enums.loan.terminationType.${terminationType}`)
        }
      } else if (terminationType === 'DURATION' && loan.duration && loan.durationType) {
        const durationType = loan.durationType === 'MONTHS'
          ? commonT('enums.loan.durationUnit.MONTHS')
          : commonT('enums.loan.durationUnit.YEARS')
        return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${loan.duration} ${durationType}`
      } else if (terminationType === 'TERMINATION' && loan.terminationPeriod && loan.terminationPeriodType) {
        const periodType = loan.terminationPeriodType === 'MONTHS'
          ? commonT('enums.loan.durationUnit.MONTHS')
          : commonT('enums.loan.durationUnit.YEARS')
        return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${loan.terminationPeriod} ${periodType}`
      }

      return commonT(`enums.loan.terminationType.${terminationType}`)
    },
    filterFn: (row: any, columnId: string, filterValue: any) => {
      const terminationType = row.original.terminationType;
      return terminationType === filterValue;
    },
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as number;
      const b = rowB.getValue(columnId) as number;
      return a - b;
    },
  }, t)
}

// Create a name column for lenders
export function createLenderNameColumn<T>(
  t: (key: string) => string,
  commonT: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey: 'name',
    header: 'table.name',
    accessorFn: (row: any) => {
      if (row.type === 'ORGANISATION') {
        return row.organisationName || '';
      }
      return `${row.firstName || ''} ${row.lastName || ''}`.trim();
    },
    cell: ({ row }) => {
      const lender = row.original;
      if (lender.type === 'ORGANISATION') {
        return lender.organisationName || '';
      }
      return `${lender.firstName || ''} ${lender.lastName || ''}`.trim();
    },
    filterFn: compoundTextFilter,
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    },
  }, t);
}

// Create an address column for lenders
export function createLenderAddressColumn<T>(
  t: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey: 'address',
    header: 'table.address',
    accessorFn: (row: any) => {
      const street = row.street || '';
      const addon = row.addon ? `, ${row.addon}` : '';
      const zip = row.zip || '';
      const place = row.place || '';
      const country = row.country || '';

      if (!street && !zip && !place && !country) return '';

      return `${street}${addon} ${zip} ${place} ${country}`.trim();
    },
    cell: ({ row }) => {
      const street = row.original.street || '';
      const addon = row.original.addon ? `, ${row.original.addon}` : '';
      const zip = row.original.zip || '';
      const place = row.original.place || '';
      const country = row.original.country || '';

      if (!street && !zip && !place && !country) return '';

      return (
        <div className="flex flex-col">
          {street && <div className="whitespace-nowrap">{`${street}${addon}`}</div>}
          {(zip || place || country) && (
            <div>{`${zip} ${place}${country ? `, ${country}` : ''}`}</div>
          )}
        </div>
      );
    },
    filterFn: compoundTextFilter,
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    },
  }, t);
}

// Create a banking column for lenders
export function createLenderBankingColumn<T>(
  t: (key: string) => string
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey: 'banking',
    header: 'table.banking',
    accessorFn: (row: any) => {
      const iban = row.iban || '';
      const bic = row.bic || '';

      if (!iban && !bic) return '';

      return `${iban} ${bic}`.trim();
    },
    cell: ({ row }) => {
      const iban = row.original.iban || '';
      const bic = row.original.bic || '';

      if (!iban && !bic) return '';

      return (
        <div className="flex flex-col">
          {iban && <div className="whitespace-nowrap">{iban}</div>}
          {bic && <div className="text-gray-500">{bic}</div>}
        </div>
      );
    },
    filterFn: compoundTextFilter,
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    },
  }, t);
}

// Create an enum badge column for lenders
export function createLenderEnumBadgeColumn<T>(
  accessorKey: string,
  headerKey: string,
  enumPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
  getBadgeVariant?: (value: string) => "default" | "secondary" | "destructive" | "outline"
): ColumnDef<T> {
  return createColumn<T>({
    accessorKey,
    header: headerKey,
    cell: ({ row }) => {
      const value = row.getValue(accessorKey) as string;
      if (!value) return '';

      const enumText = commonT(`${enumPrefix}.${value}`);

      // Define badge variant based on status
      let variant: "default" | "secondary" | "destructive" | "outline" = "default";

      if (getBadgeVariant) {
        variant = getBadgeVariant(value);
      }

      return (
        <Badge variant={variant}>
          {enumText}
        </Badge>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue(columnId) as string;
      const b = rowB.getValue(columnId) as string;
      return a.localeCompare(b);
    }
  }, t);
} 