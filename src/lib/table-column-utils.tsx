import type { Lender, Loan } from '@prisma/client';
import type { ColumnDef, Row, VisibilityState } from '@tanstack/react-table';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumnFilters } from '@/components/ui/data-table';
import type { ColumnGroupMeta } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { formatCurrency, getLenderName, NumberParser, resolveIntlLocaleForDates } from '@/lib/utils';
import { formatDurationDays } from '@/lib/format-duration';
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

  // Support single- and multi-select enum filters.
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    return filterValue.includes(String(value));
  }

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

function mergeExportMeta<T>(
  column: ColumnDef<T>,
  exportMeta: {
    type?: import('@/components/ui/data-table').ColumnExportType;
    label?: string;
    getValue?: (row: unknown) => string | number | Date | null | undefined;
    wrapText?: boolean;
  },
): ColumnDef<T> {
  return {
    ...(column as ColumnDef<T>),
    meta: {
      ...column.meta,
      export: {
        ...column.meta?.export,
        ...exportMeta,
      },
    },
  };
}

// Create a basic column definition
export function createColumn<T>(config: ColumnConfig<T>, t: (key: string) => string): ColumnDef<T> {
  const column = {
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
      ...config.meta,
      style: {
        textAlign: config.align ?? 'left',
        ...config.meta?.style,
      },
      export: {
        type: 'text' as const,
        label: config.header ? t(config.header) : config.meta?.export?.label,
        ...config.meta?.export,
      },
    },
  } satisfies ColumnDef<T>;

  return column;
}

export function withColumnGroup<T>(columns: ColumnDef<T>[], columnGroup?: ColumnGroupMeta): ColumnDef<T>[] {
  if (!columnGroup) {
    return columns;
  }
  return columns.map((column) => ({
    ...column,
    meta: {
      ...column.meta,
      columnGroup,
    },
  }));
}

export function createNumberColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  locale: string,
  options?: { integer?: boolean },
): ColumnDef<T> {
  const parser = new NumberParser(locale);
  const column = createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      cell: ({ row }) => {
        const value =
          row.getValue(accessorKey) !== null &&
          row.getValue(accessorKey) !== undefined &&
          row.getValue(accessorKey) !== ''
            ? parser.parse(row.getValue(accessorKey) as string)
            : '';
        return <div className="tabular-nums">{value}</div>;
      },
    },
    t,
  );

  // Add the filter function after creation
  column.filterFn = 'inNumberRange';
  return mergeExportMeta(column, { type: options?.integer === false ? 'number' : 'integer' });
}
export function createCurrencyColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  _: string,
): ColumnDef<T> {
  const parser = new NumberParser('de-DE');
  const column = createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      align: 'right',
      cell: ({ row }) => {
        const value = parser.parse(row.getValue(accessorKey) as string) || 0;
        return <div className="text-right tabular-nums">{formatCurrency(value)}</div>;
      },
    },
    t,
  );

  // Add the filter function after creation
  column.filterFn = 'inNumberRange';
  return mergeExportMeta(column, { type: 'currency' });
}
export function createDateColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  locale?: string,
): ColumnDef<T> {
  return mergeExportMeta(
    createColumn<T>(
      {
        accessorKey,
        header: headerKey,
        cell: ({ row }) => {
          const dateStr = row.getValue(accessorKey) as string;
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr);
            return Number.isNaN(date.getTime())
              ? ''
              : date.toLocaleDateString(resolveIntlLocaleForDates(locale ?? 'de'), {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
          } catch (_) {
            return '';
          }
        },
      },
      t,
    ),
    { type: 'date' },
  );
}

export function createDurationDaysColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  t: (key: string) => string,
  durationT: (key: string, values?: Record<string, number>) => string,
): ColumnDef<T> {
  const column = createColumn<T>(
    {
      accessorKey,
      header: headerKey,
      cell: ({ row }) => {
        const value = row.getValue(accessorKey) as number | null | undefined;
        return <div className="tabular-nums">{formatDurationDays(value, durationT)}</div>;
      },
    },
    t,
  );

  column.filterFn = 'inNumberRange';
  return mergeExportMeta(column, { type: 'integer' });
}
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
        return <div className="text-right tabular-nums">{`${value.toFixed(2)}%`}</div>;
      },
    },
    t,
  );

  // Add the filter function after creation
  column.filterFn = 'inNumberRange';
  return mergeExportMeta(column, { type: 'percent' });
}
export function createEnumBadgeColumn<T>(
  accessorKey: string,
  headerKey: string | undefined,
  enumPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
  getBadgeVariant?: (value: string) => 'default' | 'secondary' | 'destructive' | 'outline',
): ColumnDef<T> {
  const columnId = accessorKeyToColumnId(accessorKey);
  const column = createColumn<T>(
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

  return mergeExportMeta(column, {
    type: 'text',
    getValue: (row) => {
      const value = (row as Record<string, unknown>)[accessorKey];
      if (!value) return '';
      return commonT(`${enumPrefix}.${String(value)}`);
    },
  });
}
export function createTerminationTypeColumn<T>(
  t: (key: string) => string,
  commonT: (key: string) => string,
): ColumnDef<T> {
  return mergeExportMeta(
    createColumn<T>(
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
    ),
    {
      type: 'text',
      getValue: (row) => {
        const terminationType = (row as Record<string, unknown>).terminationType;
        if (!terminationType) return '';
        return commonT(`enums.loan.terminationType.${String(terminationType)}`);
      },
    },
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
export function formatLenderAddressForExport(
  row: Pick<Lender, 'street' | 'addon' | 'zip' | 'place' | 'country'>,
): string {
  const street = row.street || '';
  const addon = row.addon ? `, ${row.addon}` : '';
  const zip = row.zip || '';
  const place = row.place || '';
  const country = row.country || '';

  if (!street && !zip && !place && !country) return '';

  const lines: string[] = [];
  if (street) {
    lines.push(`${street}${addon}`);
  }
  if (zip || place || country) {
    lines.push(`${zip} ${place}${country ? `, ${country}` : ''}`.trim());
  }
  return lines.join('\n');
}

export function createLenderAddressColumn<T extends Pick<Lender, 'street' | 'addon' | 'zip' | 'place' | 'country'>>(
  t: (key: string) => string,
): ColumnDef<T> {
  const column = createColumn<T>(
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

  return mergeExportMeta(column, {
    type: 'text',
    getValue: (row) =>
      formatLenderAddressForExport(row as Pick<Lender, 'street' | 'addon' | 'zip' | 'place' | 'country'>),
    wrapText: true,
  });
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
  const column = createColumn<T>(
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

  return mergeExportMeta(column, {
    type: 'text',
    getValue: (row) => {
      const value = (row as Record<string, unknown>)[accessorKey];
      if (!value) return '';
      return commonT(`${enumPrefix}.${String(value)}`);
    },
  });
}

export function createAdditionalFieldsColumns<T>(
  config: AdditionalFieldConfig[] | undefined | null,
  accessorKey: string,
  t: (key: string) => string,
  locale: string,
): ColumnDef<T>[] {
  return (config?.map((field) => {
    const fieldKey = `${accessorKey}.${field.id}`;

    if (field.type === AdditionalFieldType.DATE) {
      return mergeExportMeta(
        {
          ...createDateColumn<T>(fieldKey, undefined, t, locale),
          header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
          id: fieldKey,
        } as ColumnDef<T>,
        { label: field.name },
      );
    }

    if (field.type === AdditionalFieldType.NUMBER) {
      if (field.numberFormat === AdditionalNumberFormat.MONEY) {
        return mergeExportMeta(
          {
            ...createCurrencyColumn<T>(fieldKey, undefined, t, locale),
            header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
            id: fieldKey,
          } as ColumnDef<T>,
          { label: field.name },
        );
      }
      if (field.numberFormat === AdditionalNumberFormat.PERCENT) {
        return mergeExportMeta(
          {
            ...createPercentageColumn<T>(fieldKey, undefined, t, locale),
            header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
            id: fieldKey,
          } as ColumnDef<T>,
          { label: field.name },
        );
      }
      return mergeExportMeta(
        {
          ...createNumberColumn<T>(fieldKey, undefined, t, locale, { integer: false }),
          header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
          id: fieldKey,
        } as ColumnDef<T>,
        { label: field.name },
      );
    }

    if (field.type === AdditionalFieldType.SELECT) {
      return mergeExportMeta(
        {
          ...createColumn<T>(
            {
              accessorKey: fieldKey,
              cell: ({ row }) => {
                const value = row.getValue(fieldKey) as string;
                if (!value) return '';
                return <Badge variant="outline">{value}</Badge>;
              },
              filterFn: enumFilter,
            },
            t,
          ),
          id: fieldKey,
          header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
        } as ColumnDef<T>,
        { label: field.name },
      );
    }

    return mergeExportMeta(
      {
        ...createColumn<T>(
          {
            accessorKey: fieldKey,
            header: undefined,
            id: fieldKey,
          },
          t,
        ),
        header: ({ column }) => <DataTableColumnHeader column={column} title={field.name} />,
      } as ColumnDef<T>,
      { label: field.name },
    );
  }) ?? []) as ColumnDef<T>[];
}

// biome-ignore lint/correctness/noUnusedVariables: needed
export function createAdditionalFieldDefaultColumnVisibility<T>(
  accessorKey: string,
  config: AdditionalFieldConfig[] | undefined | null,
) {
  const defaultColumnVisibility: VisibilityState = {};
  config?.forEach((field) => {
    defaultColumnVisibility[`${accessorKey}.${field.id}`] = false;
  });
  return defaultColumnVisibility;
}

// biome-ignore lint/correctness/noUnusedVariables: needed
export function createAdditionalFieldFilters<T>(
  accessorKey: string,
  config: AdditionalFieldConfig[] | undefined | null,
) {
  const filters: DataTableColumnFilters = {};
  config?.forEach((field) => {
    if (field.type === AdditionalFieldType.TEXT) {
      filters[`${accessorKey}.${field.id}`] = {
        type: 'text' as const,
        label: field.name,
      };
    }
    if (field.type === AdditionalFieldType.SELECT) {
      filters[`${accessorKey}.${field.id}`] = {
        type: 'select' as const,
        label: field.name,
        options: field.selectOptions.map((option) => ({ label: option, value: option })),
      };
    }
    if (field.type === AdditionalFieldType.DATE) {
      filters[`${accessorKey}.${field.id}`] = {
        type: 'date' as const,
        label: field.name,
      };
    }
    if (field.type === AdditionalFieldType.NUMBER) {
      filters[`${accessorKey}.${field.id}`] = {
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

type TerminationModalitiesData = Pick<
  Loan,
  | 'terminationType'
  | 'signDate'
  | 'endDate'
  | 'duration'
  | 'durationType'
  | 'terminationPeriod'
  | 'terminationPeriodType'
>;

export function formatTerminationModalities(
  data: TerminationModalitiesData,
  commonT: (key: string, values?: Record<string, string>) => string,
  formatDate?: (date: Date) => string,
): string {
  const { terminationType } = data;
  if (!terminationType) return '-';

  const defaultFormatDate = (d: Date) => (Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('de-DE'));
  const durationUnitLabel = (unit: string) =>
    unit === 'MONTHS' ? commonT('enums.loan.durationUnit.MONTHS') : commonT('enums.loan.durationUnit.YEARS');

  switch (terminationType) {
    case 'ENDDATE': {
      if (!data.endDate) return '-';
      const date = new Date(data.endDate);
      const formatted = (formatDate ?? defaultFormatDate)(date);
      return commonT('enums.loan.terminationModalities.ENDDATE', { date: formatted || '-' });
    }
    case 'DURATION': {
      if (!data.duration || !data.durationType) return '-';
      const duration = `${data.duration} ${durationUnitLabel(data.durationType)}`;
      const calculatedEndDate = moment(data.signDate)
        .add(data.duration, data.durationType === 'MONTHS' ? 'months' : 'years')
        .toDate();
      const formatted = (formatDate ?? defaultFormatDate)(calculatedEndDate);
      return commonT('enums.loan.terminationModalities.DURATION', { duration, date: formatted || '-' });
    }
    case 'TERMINATION': {
      if (!data.terminationPeriod || !data.terminationPeriodType) return '-';
      const duration = `${data.terminationPeriod} ${durationUnitLabel(data.terminationPeriodType)}`;
      return commonT('enums.loan.terminationModalities.TERMINATION', { duration });
    }
    default:
      return '-';
  }
}

// Create a termination modalities column
export function createTerminationModalitiesColumn<
  T extends Pick<
    Loan,
    | 'terminationType'
    | 'signDate'
    | 'endDate'
    | 'duration'
    | 'durationType'
    | 'terminationPeriod'
    | 'terminationPeriodType'
  >,
>(t: (key: string) => string, commonT: (key: string) => string): ColumnDef<T> {
  return createColumn<T>(
    {
      id: 'terminationModalities',
      accessorKey: 'terminationModalities',
      header: 'table.terminationModalities',
      accessorFn: (row: T) => formatTerminationModalities(row, commonT),
      cell: ({ row }) => formatTerminationModalities(row.original, commonT),
      filterFn: compoundTextFilter,
    },
    t,
  );
}
