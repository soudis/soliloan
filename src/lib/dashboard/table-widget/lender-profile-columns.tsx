import type { Country, Lender } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { ColumnGroupMeta } from '@/components/ui/data-table';
import type { AdditionalFieldConfig } from '@/lib/schemas/common';
import {
  compoundTextFilter,
  createAdditionalFieldsColumns,
  createColumn,
  enumFilter,
  formatLenderAddressForExport,
  withColumnGroup,
} from '@/lib/table-column-utils';
import { getLenderName } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';

export type LenderProfileRow = Pick<
  Lender,
  | 'lenderNumber'
  | 'type'
  | 'firstName'
  | 'lastName'
  | 'organisationName'
  | 'titlePrefix'
  | 'titleSuffix'
  | 'email'
  | 'telNo'
  | 'street'
  | 'addon'
  | 'zip'
  | 'place'
  | 'country'
  | 'iban'
  | 'bic'
  | 'salutation'
  | 'notificationType'
> & {
  additionalFields?: Record<string, unknown> | null;
};

export const LENDER_DETAIL_FIELD_IDS = [
  'firstName',
  'lastName',
  'organisationName',
  'titlePrefix',
  'titleSuffix',
  'street',
  'addon',
  'zip',
  'place',
  'country',
  'iban',
  'bic',
] as const;

export type LenderProfileColumnMeta = {
  id: string;
  labelKey: string;
};

export const LENDER_DETAIL_COLUMN_META: LenderProfileColumnMeta[] = [
  { id: 'firstName', labelKey: 'table.firstName' },
  { id: 'lastName', labelKey: 'table.lastName' },
  { id: 'organisationName', labelKey: 'table.organisationName' },
  { id: 'titlePrefix', labelKey: 'table.titlePrefix' },
  { id: 'titleSuffix', labelKey: 'table.titleSuffix' },
  { id: 'street', labelKey: 'table.street' },
  { id: 'addon', labelKey: 'table.addon' },
  { id: 'zip', labelKey: 'table.zip' },
  { id: 'place', labelKey: 'table.place' },
  { id: 'country', labelKey: 'table.country' },
  { id: 'iban', labelKey: 'table.iban' },
  { id: 'bic', labelKey: 'table.bic' },
];

export const LENDER_PROFILE_BASE_COLUMN_META: LenderProfileColumnMeta[] = [
  { id: 'lenderNumber', labelKey: 'table.lenderNumber' },
  { id: 'type', labelKey: 'table.type' },
  { id: 'name', labelKey: 'table.name' },
  { id: 'email', labelKey: 'table.email' },
  { id: 'telNo', labelKey: 'table.telNo' },
  { id: 'address', labelKey: 'table.address' },
  { id: 'banking', labelKey: 'table.banking' },
  { id: 'salutation', labelKey: 'table.salutation' },
  { id: 'notificationType', labelKey: 'table.notificationType' },
];

function columnId(idPrefix: string, field: string): string {
  return idPrefix ? `${idPrefix}${field}` : field;
}

function readLenderField(lender: LenderProfileRow | null | undefined, field: keyof LenderProfileRow): unknown {
  if (!lender) {
    return '';
  }
  return lender[field] ?? '';
}

function formatLenderAddressLine(lender: LenderProfileRow | null | undefined): string {
  if (!lender) return '';
  const street = lender.street || '';
  const addon = lender.addon ? `, ${lender.addon}` : '';
  const zip = lender.zip || '';
  const place = lender.place || '';
  const country = lender.country || '';
  if (!street && !zip && !place && !country) return '';
  return `${street}${addon} ${zip} ${place} ${country}`.trim();
}

function formatLenderBankingLine(lender: LenderProfileRow | null | undefined): string {
  if (!lender) return '';
  const iban = lender.iban || '';
  const bic = lender.bic || '';
  if (!iban && !bic) return '';
  return `${iban} ${bic}`.trim();
}

function createProfileTextColumn<T>(
  field: keyof LenderProfileRow,
  headerKey: string,
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, String(field));
  return createColumn<T>(
    {
      accessorKey: id,
      id,
      header: headerKey,
      accessorFn: (row: T) => {
        const value = readLenderField(getLender(row), field);
        return value == null ? '' : String(value);
      },
      cell: ({ row }) => {
        const value = readLenderField(getLender(row.original), field);
        return value == null || value === '' ? '' : String(value);
      },
      filterFn: compoundTextFilter,
    },
    t,
  );
}

function createProfileNameColumn<T>(
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, 'name');
  return createColumn<T>(
    {
      accessorKey: id,
      id,
      header: 'table.name',
      accessorFn: (row: T) => {
        const lender = getLender(row);
        return lender ? getLenderName(lender) : '';
      },
      cell: ({ row }) => {
        const lender = getLender(row.original);
        return lender ? getLenderName(lender) : '';
      },
      filterFn: compoundTextFilter,
    },
    t,
  );
}

function createProfileAddressColumn<T>(
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, 'address');
  const column = createColumn<T>(
    {
      accessorKey: id,
      id,
      header: 'table.address',
      accessorFn: (row: T) => formatLenderAddressLine(getLender(row)),
      cell: ({ row }) => {
        const lender = getLender(row.original);
        if (!lender) return '';
        const street = lender.street || '';
        const addon = lender.addon ? `, ${lender.addon}` : '';
        const zip = lender.zip || '';
        const place = lender.place || '';
        const country = lender.country || '';
        if (!street && !zip && !place && !country) return '';
        return (
          <div className="flex flex-col">
            {street && <div className="whitespace-nowrap">{`${street}${addon}`}</div>}
            {(zip || place || country) && <div>{`${zip} ${place}${country ? `, ${country}` : ''}`}</div>}
          </div>
        );
      },
      filterFn: compoundTextFilter,
    },
    t,
  );

  return {
    ...column,
    meta: {
      ...column.meta,
      export: {
        ...column.meta?.export,
        type: 'text',
        getValue: (row) => formatLenderAddressForExport(getLender(row as T) ?? ({} as LenderProfileRow)),
        wrapText: true,
      },
    },
  };
}

function createProfileBankingColumn<T>(
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, 'banking');
  return createColumn<T>(
    {
      accessorKey: id,
      id,
      header: 'table.banking',
      accessorFn: (row: T) => formatLenderBankingLine(getLender(row)),
      cell: ({ row }) => {
        const lender = getLender(row.original);
        if (!lender) return '';
        const iban = lender.iban || '';
        const bic = lender.bic || '';
        if (!iban && !bic) return '';
        return (
          <div className="flex flex-col">
            {iban && <div className="whitespace-nowrap">{iban}</div>}
            {bic && <div className="text-gray-500">{bic}</div>}
          </div>
        );
      },
      filterFn: compoundTextFilter,
    },
    t,
  );
}

function createProfileCountryColumn<T>(
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, 'country');
  return createColumn<T>(
    {
      accessorKey: id,
      id,
      header: 'table.country',
      accessorFn: (row: T) => readLenderField(getLender(row), 'country'),
      cell: ({ row }) => {
        const value = getLender(row.original)?.country as Country | null | undefined;
        if (!value) return '';
        return commonT(`countries.${value.toLowerCase()}`);
      },
      filterFn: enumFilter,
      meta: {
        export: {
          type: 'text',
          getValue: (row) => {
            const value = getLender(row as T)?.country;
            if (!value) return '';
            return commonT(`countries.${String(value).toLowerCase()}`);
          },
        },
      },
    },
    t,
  );
}

function createProfileLenderNumberColumn<T>(
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, 'lenderNumber');
  return createColumn<T>(
    {
      accessorKey: id,
      id,
      header: 'table.lenderNumber',
      accessorFn: (row: T) => getLender(row)?.lenderNumber ?? '',
      cell: ({ row }) => {
        const value = getLender(row.original)?.lenderNumber;
        return value == null ? '' : String(value);
      },
      meta: {
        export: { type: 'integer' },
      },
    },
    t,
  );
}

function createProfileEnumColumn<T>(
  field: 'type' | 'salutation' | 'notificationType',
  headerKey: string,
  enumPrefix: string,
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
): ColumnDef<T> {
  const id = columnId(idPrefix, field);
  const column = createColumn<T>(
    {
      accessorKey: id,
      id,
      header: headerKey,
      accessorFn: (row: T) => readLenderField(getLender(row), field),
      cell: ({ row }) => {
        const value = getLender(row.original)?.[field];
        if (!value) return '';
        return <Badge variant="outline">{commonT(`${enumPrefix}.${String(value)}`)}</Badge>;
      },
      filterFn: enumFilter,
    },
    t,
  );

  return {
    ...column,
    meta: {
      ...column.meta,
      export: {
        ...column.meta?.export,
        type: 'text',
        getValue: (row) => {
          const value = getLender(row as T)?.[field];
          if (!value) return '';
          return commonT(`${enumPrefix}.${String(value)}`);
        },
      },
    },
  };
}

function createProfileAdditionalFieldsColumns<T>(
  config: AdditionalFieldConfig[] | undefined | null,
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
  locale: string,
): ColumnDef<T>[] {
  const accessorRoot = columnId(idPrefix, 'additionalFields');
  return createAdditionalFieldsColumns<T>(config, accessorRoot, t, locale).map((column) => {
    const fieldKey = column.id?.replace(`${accessorRoot}.`, '') ?? '';
    return {
      ...column,
      accessorFn: (row: T) => {
        const fields = getLender(row)?.additionalFields;
        const value = fields?.[fieldKey];
        return value == null ? '' : value;
      },
    } as ColumnDef<T>;
  });
}

function buildDetailColumns<T>(
  getLender: (row: T) => LenderProfileRow | null | undefined,
  idPrefix: string,
  t: (key: string) => string,
  commonT: (key: string) => string,
): ColumnDef<T>[] {
  return [
    createProfileTextColumn<T>('firstName', 'table.firstName', getLender, idPrefix, t),
    createProfileTextColumn<T>('lastName', 'table.lastName', getLender, idPrefix, t),
    createProfileTextColumn<T>('organisationName', 'table.organisationName', getLender, idPrefix, t),
    createProfileTextColumn<T>('titlePrefix', 'table.titlePrefix', getLender, idPrefix, t),
    createProfileTextColumn<T>('titleSuffix', 'table.titleSuffix', getLender, idPrefix, t),
    createProfileTextColumn<T>('street', 'table.street', getLender, idPrefix, t),
    createProfileTextColumn<T>('addon', 'table.addon', getLender, idPrefix, t),
    createProfileTextColumn<T>('zip', 'table.zip', getLender, idPrefix, t),
    createProfileTextColumn<T>('place', 'table.place', getLender, idPrefix, t),
    createProfileCountryColumn<T>(getLender, idPrefix, t, commonT),
    createProfileTextColumn<T>('iban', 'table.iban', getLender, idPrefix, t),
    createProfileTextColumn<T>('bic', 'table.bic', getLender, idPrefix, t),
  ];
}

export function buildLenderProfileColumns<T>({
  getLender,
  idPrefix = '',
  columnGroup,
  mode,
  project,
  t,
  commonT,
  locale,
}: {
  getLender: (row: T) => LenderProfileRow | null | undefined;
  idPrefix?: string;
  columnGroup?: ColumnGroupMeta;
  mode: 'full' | 'detailOnly';
  project?: ProjectWithConfiguration;
  t: (key: string) => string;
  commonT: (key: string) => string;
  locale?: string;
}): ColumnDef<T>[] {
  if (mode === 'detailOnly') {
    return withColumnGroup(buildDetailColumns(getLender, idPrefix, t, commonT), columnGroup);
  }

  const columns: ColumnDef<T>[] = [
    createProfileLenderNumberColumn(getLender, idPrefix, t),
    createProfileEnumColumn('type', 'table.type', 'enums.lender.type', getLender, idPrefix, t, commonT),
    createProfileNameColumn(getLender, idPrefix, t),
    createProfileTextColumn<T>('email', 'table.email', getLender, idPrefix, t),
    createProfileTextColumn<T>('telNo', 'table.telNo', getLender, idPrefix, t),
    createProfileAddressColumn(getLender, idPrefix, t),
    createProfileBankingColumn(getLender, idPrefix, t),
    createProfileEnumColumn(
      'salutation',
      'table.salutation',
      'enums.lender.salutation',
      getLender,
      idPrefix,
      t,
      commonT,
    ),
    createProfileEnumColumn(
      'notificationType',
      'table.notificationType',
      'enums.lender.notificationType',
      getLender,
      idPrefix,
      t,
      commonT,
    ),
  ];

  if (project && locale) {
    columns.push(
      ...createProfileAdditionalFieldsColumns<T>(
        project.configuration.lenderAdditionalFields,
        getLender,
        idPrefix,
        t,
        locale,
      ),
    );
  }

  columns.push(...buildDetailColumns(getLender, idPrefix, t, commonT));

  return withColumnGroup(columns, columnGroup);
}

export function prefixColumnMetaIds(meta: LenderProfileColumnMeta[], idPrefix: string): LenderProfileColumnMeta[] {
  return meta.map((entry) => ({
    ...entry,
    id: columnId(idPrefix, entry.id),
  }));
}

export function buildLenderProfileColumnMeta(
  project: ProjectWithConfiguration,
  idPrefix = '',
): LenderProfileColumnMeta[] {
  const additionalFieldMeta =
    project.configuration.lenderAdditionalFields?.map((field) => ({
      id: columnId(idPrefix, `additionalFields.${field.id}`),
      labelKey: field.name,
    })) ?? [];

  return [
    ...prefixColumnMetaIds(LENDER_PROFILE_BASE_COLUMN_META, idPrefix),
    ...additionalFieldMeta,
    ...prefixColumnMetaIds(LENDER_DETAIL_COLUMN_META, idPrefix),
  ];
}

export function buildLenderProfileDefaultColumnVisibility(
  project: ProjectWithConfiguration,
  idPrefix: string,
  visibleFieldIds: string[] = [],
): Record<string, boolean> {
  const visibleIds = new Set(visibleFieldIds.map((field) => columnId(idPrefix, field)));
  return Object.fromEntries(buildLenderProfileColumnMeta(project, idPrefix).map(({ id }) => [id, visibleIds.has(id)]));
}
