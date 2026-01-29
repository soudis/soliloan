import type { ColumnDef, Row, VisibilityState } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import type { DataTableColumnFilters } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { NumberParser, formatCurrency, getLenderName } from '@/lib/utils';
import { type AdditionalFieldConfig, AdditionalFieldType, AdditionalNumberFormat } from './schemas/common';

// Define the custom filter function for compound text fields
export function compoundTextFilter<T>(row: Row<T>, columnId: string, filterValue: unknown) {
  const value = row.getValue(columnId);
  if (!value) return false;

  // Convert both the value and filter to lowercase for case-insensitive search
  const searchValue = String(value).toLowerCase();
  const searchFilter = String(filterValue).toLowerCase();

  return searchValue.includes(searchFilter);
}

// Define the custom filter function for enum fields
export function enumFilter<T>(row: Row<T>, columnId: string, filterValue: unknown) {
  const value = row.getValue(columnId);

  // For enum fields, we do an exact match
  return value === filterValue || filterValue === '';
}

// Define the custom filter function type
export type FilterFn = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'compoundText' | 'numberRange' | 'enum';

// Convert accessorKey to column ID by replacing dots with underscores
// Without this TanStack would change the the column id internally and accessing with accessorKey would not work.
export function accessorKeyToColumnId(accessorKey: string): string {
  return accessorKey.replaceAll('.', '_');
}

type ColumnConfig<T> = ColumnDef<T> & {
  accessorKey: string;
  header?: string | undefined;
  id?: string | undefined;
  align?: 'left' | 'right' | 'center';
};

// Create a basic column definition
export function createColumn<T>(config: ColumnConfig<T>, t: (key: string) => string): ColumnDef<T> {
  return {
    ...config,
    header: ({ column }) =>
      config.header ? <DataTableColumnHeader column={column} title={t(config.header)} /> : undefined,
    filterFn: config.filterFn || 'includesString',
    sortingFn:
      config.sortingFn ||
      ((rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId);
        const b = rowB.getValue(columnId);
        if (a === b) return 0;
        if (a === null || a === undefined) return 1;
        if (b === null || b === undefined) return -1;
        return a < b ? -1 : 1;
      }),
    meta: {
      style: {
        textAlign: config.align ?? 'left',
      },
    },
  };
}

export function createNumberColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  locale: string,
): ColumnDef<T> {
  const parser = new NumberParser(locale);
  const column = createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      cell: ({ row }) => {
        return row.getValue(accessorKey) !== null &&
          row.getValue(accessorKey) !== undefined &&
          row.getValue(accessorKey) !== ''
          ? parser.parse(row.getValue(accessorKey) as string)
          : '';
      },
    },
    t,
  );

  // Add the filter function after creation
  column.filterFn = 'inNumberRange';
  return column;
}

// Create a currency column
export function createCurrencyColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  locale: string,
): ColumnDef<T> {
  const parser = new NumberParser('de-DE');
  const column = createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      align: 'right',
      cell: ({ row }) => {
        const value = parser.parse(row.getValue(accessorKey) as string) || 0;
        return <div className="text-right">{formatCurrency(value)}</div>;
      },
    },
    t,
  );

  // Add the filter function after creation
  column.filterFn = 'inNumberRange';
  return column;
}

// Create a date column
export function createDateColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      cell: ({ row }) => {
        const dateStr = row.getValue(accessorKey) as string;
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE');
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          return '';
        }
      },
    },
    t,
  );
}

// Create a percentage column
export function createPercentageColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  locale: string,
): ColumnDef<T> {
  const parser = new NumberParser(locale);
  const column = createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      cell: ({ row }) => {
        const value = parser.parse(row.getValue(accessorKey) as string) || 0;
        return <div className="text-right">{`${value.toFixed(2)}%`}</div>;
      },
    },
    t,
  );

  // Add the filter function after creation
  column.filterFn = 'inNumberRange';
  return column;
}

// Create an enum column with badge
export function createEnumBadgeColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  enumPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
  getBadgeVariant?: (value: string) => 'default' | 'secondary' | 'destructive' | 'outline',
): ColumnDef<T> {
  const columnId = accessorKeyToColumnId(accessorKey);
  return createColumn<T>(
    {
      accessorKey,
      id: columnId,
      header: headerKey,
      cell: ({ row }) => {
        const value = row.getValue(columnId) as string;
        if (!value) return '';

        const enumText = commonT(`${enumPrefix}.${value}`);

        // Define badge variant based on status
        let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';

        if (getBadgeVariant) {
          variant = getBadgeVariant(value);
        }

        return <Badge variant={variant}>{enumText}</Badge>;
      },
      filterFn: enumFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;

        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;

        const aLocal = commonT(`${enumPrefix}.${a}`);
        const bLocal = commonT(`${enumPrefix}.${b}`);

        return aLocal.localeCompare(bLocal);
      },
    },
    t,
  );
}

// Create a termination type column
export function createTerminationTypeColumn<T>(
  t: (key: string) => string,
  commonT: (key: string) => string,
): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey: 'terminationType',
      header: 'table.terminationType',
      cell: ({ row }) => {
        const terminationType = row.getValue('terminationType') as string;
        if (!terminationType) return '';

        return commonT(`enums.loan.terminationType.${terminationType}`);
      },
      filterFn: enumFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as number;
        const b = rowB.getValue(columnId) as number;
        return a - b;
      },
    },
    t,
  );
}

// Create a name column for lenders
export function createLenderNameColumn<
  T extends Pick<Lender, 'type' | 'firstName' | 'lastName' | 'organisationName' | 'titlePrefix' | 'titleSuffix'>,
>(t: (key: string) => string): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey: 'name',
      header: 'table.name',
      accessorFn: (row: T) => {
        return getLenderName(row);
      },
      cell: ({ row }) => {
        const lender = row.original;
        return getLenderName(lender);
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    t,
  );
}

// Create an address column for lenders
export function createLenderAddressColumn<T extends Pick<Lender, 'street' | 'addon' | 'zip' | 'place' | 'country'>>(
  t: (key: string) => string,
): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey: 'address',
      header: 'table.address',
      accessorFn: (row: T) => {
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
            {(zip || place || country) && <div>{`${zip} ${place}${country ? `, ${country}` : ''}`}</div>}
          </div>
        );
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    t,
  );
}

// Create a banking column for lenders
export function createLenderBankingColumn<T extends Pick<Lender, 'iban' | 'bic'>>(
  t: (key: string) => string,
): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey: 'banking',
      header: 'table.banking',
      accessorFn: (row: T) => {
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
    },
    t,
  );
}

// Create an enum badge column for lenders
export function createLenderEnumBadgeColumn<T>(
  accessorKey: string,
  headerKey: string,
  enumPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
  getBadgeVariant?: (value: string) => 'default' | 'secondary' | 'destructive' | 'outline',
): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      cell: ({ row }) => {
        const value = row.getValue(accessorKey) as string;
        if (!value) return '';

        const enumText = commonT(`${enumPrefix}.${value}`);

        // Define badge variant based on status
        let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';

        if (getBadgeVariant) {
          variant = getBadgeVariant(value);
        }

        return <Badge variant={variant}>{enumText}</Badge>;
      },
      filterFn: enumFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    t,
  );
}

export function createAdditionalFieldsColumns<T>(
  config: AdditionalFieldConfig[] | undefined | null,
  accessorKey: string,
  t: (key: string) => string,
  locale: string,
): ColumnDef<T>[] {
  return (config?.map((field) => {
    if (field.type === AdditionalFieldType.DATE) {
      return {
        ...createDateColumn<T>(`${accessorKey}.${field.name}`, undefined, t),
        header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
        id: `${accessorKey}.${field.name}`,
      };
    }

    if (field.type === AdditionalFieldType.NUMBER) {
      if (field.numberFormat === AdditionalNumberFormat.MONEY) {
        return {
          ...createCurrencyColumn<T>(`${accessorKey}.${field.name}`, undefined, t, locale),
          header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
          id: `${accessorKey}.${field.name}`,
        };
      }
      if (field.numberFormat === AdditionalNumberFormat.PERCENT) {
        return {
          ...createPercentageColumn<T>(`${accessorKey}.${field.name}`, undefined, t, locale),
          header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
          id: `${accessorKey}.${field.name}`,
        };
      }
      return {
        ...createNumberColumn<T>(`${accessorKey}.${field.name}`, undefined, t, locale),
        header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
        id: `${accessorKey}.${field.name}`,
      };
    }

    if (field.type === AdditionalFieldType.SELECT) {
      return {
        ...createColumn<T>(
          {
            accessorKey: `${accessorKey}.${field.name}`,
            cell: ({ row }) => {
              const value = row.getValue(`${accessorKey}.${field.name}`) as string;
              if (!value) return '';
              return <Badge variant="outline">{value}</Badge>;
            },
            filterFn: enumFilter,
          },
          t,
        ),
        id: `${accessorKey}.${field.name}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
      };
    }

    return {
      ...createColumn<T>(
        {
          accessorKey: `${accessorKey}.${field.name}`,
          header: undefined,
          id: `${accessorKey}.${field.name}`,
        },
        t,
      ),
      header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
    };
  }) ?? []) as ColumnDef<T>[];
}

export function createAdditionalFieldDefaultColumnVisibility<T>(
  accessorKey: string,
  config: AdditionalFieldConfig[] | undefined | null,
) {
  const defaultColumnVisibility: VisibilityState = {};
  // biome-ignore lint/complexity/noForEach: <explanation>
  config?.forEach((field) => {
    defaultColumnVisibility[`${accessorKey}.${field.name}`] = false;
  });
  return defaultColumnVisibility;
}

export function createAdditionalFieldFilters<T>(
  accessorKey: string,
  config: AdditionalFieldConfig[] | undefined | null,
) {
  const filters: DataTableColumnFilters = {};
  // biome-ignore lint/complexity/noForEach: <explanation>
  config?.forEach((field) => {
    if (field.type === AdditionalFieldType.TEXT) {
      filters[`${accessorKey}.${field.name}`] = {
        type: 'text' as const,
        label: field.name,
      };
    }
    if (field.type === AdditionalFieldType.SELECT) {
      filters[`${accessorKey}.${field.name}`] = {
        type: 'select' as const,
        label: field.name,
        options: field.selectOptions.map((option) => ({ label: option, value: option })),
      };
    }
    if (field.type === AdditionalFieldType.DATE) {
      filters[`${accessorKey}.${field.name}`] = {
        type: 'date' as const,
        label: field.name,
      };
    }
    if (field.type === AdditionalFieldType.NUMBER) {
      filters[`${accessorKey}.${field.name}`] = {
        type: 'number' as const,
        label: field.name,
      };
    }
  });

  return filters;
}

// Create a lender name column
export function createLenderColumn<
  T extends {
    lender: Pick<Lender, 'organisationName' | 'firstName' | 'lastName' | 'type' | 'titlePrefix' | 'titleSuffix'>;
  },
>(t: (key: string) => string): ColumnDef<T> {
  return createColumn<T>(
    {
      accessorKey: 'lenderName',
      header: 'table.lenderName',
      accessorFn: (row: T) => {
        const lender = row.lender;
        if (lender.organisationName) {
          return lender.organisationName;
        }
        return `${lender.firstName || ''} ${lender.lastName || ''}`.trim();
      },
      cell: ({ row }) => {
        const lender = row.original.lender;
        if (lender.organisationName) {
          return lender.organisationName;
        }
        return `${lender.firstName || ''} ${lender.lastName || ''}`.trim();
      },
      filterFn: compoundTextFilter,
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.getValue(columnId) as string;
        const b = rowB.getValue(columnId) as string;
        return a.localeCompare(b);
      },
    },
    t,
  );
}

// Create a termination modalities column
export function createTerminationModalitiesColumn<
  T extends Pick<
    Loan,
    'terminationType' | 'endDate' | 'duration' | 'durationType' | 'terminationPeriod' | 'terminationPeriodType'
  >,
>(t: (key: string) => string, commonT: (key: string) => string): ColumnDef<T> {
  return createColumn<T>(
    {
      id: 'terminationModalities',
      accessorKey: 'terminationModalities',
      header: 'table.terminationModalities',
      accessorFn: (row: T) => {
        const terminationType = row.terminationType;

        if (terminationType === 'ENDDATE' && row.endDate) {
          try {
            const date = new Date(row.endDate);
            const formattedDate = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE');
            return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${formattedDate}`;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            return commonT(`enums.loan.terminationType.${terminationType}`);
          }
        } else if (terminationType === 'DURATION' && row.duration && row.durationType) {
          const durationType =
            row.durationType === 'MONTHS'
              ? commonT('enums.loan.durationUnit.MONTHS')
              : commonT('enums.loan.durationUnit.YEARS');
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${row.duration} ${durationType}`;
        } else if (terminationType === 'TERMINATION' && row.terminationPeriod && row.terminationPeriodType) {
          const periodType =
            row.terminationPeriodType === 'MONTHS'
              ? commonT('enums.loan.durationUnit.MONTHS')
              : commonT('enums.loan.durationUnit.YEARS');
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${row.terminationPeriod} ${periodType}`;
        }

        return commonT(`enums.loan.terminationType.${terminationType}`);
      },
      cell: ({ row }) => {
        const loan = row.original;
        const terminationType = loan.terminationType;

        if (terminationType === 'ENDDATE' && loan.endDate) {
          try {
            const date = new Date(loan.endDate);
            const formattedDate = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('de-DE');
            return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${formattedDate}`;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            return commonT(`enums.loan.terminationType.${terminationType}`);
          }
        } else if (terminationType === 'DURATION' && loan.duration && loan.durationType) {
          const durationType =
            loan.durationType === 'MONTHS'
              ? commonT('enums.loan.durationUnit.MONTHS')
              : commonT('enums.loan.durationUnit.YEARS');
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${loan.duration} ${durationType}`;
        } else if (terminationType === 'TERMINATION' && loan.terminationPeriod && loan.terminationPeriodType) {
          const periodType =
            loan.terminationPeriodType === 'MONTHS'
              ? commonT('enums.loan.durationUnit.MONTHS')
              : commonT('enums.loan.durationUnit.YEARS');
          return `${commonT(`enums.loan.terminationType.${terminationType}`)} - ${loan.terminationPeriod} ${periodType}`;
        }

        return commonT(`enums.loan.terminationType.${terminationType}`);
      },
      filterFn: compoundTextFilter,
    },
    t,
  );
}
