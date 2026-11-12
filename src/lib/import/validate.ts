import type {
  ContractStatus,
  Country,
  DurationType,
  InterestMethod,
  InterestPaymentType,
  LenderType,
  NotificationType,
  Salutation,
  TerminationType,
} from '@prisma/client';
import { AdditionalFieldType, AdditionalNumberFormat } from '@/lib/schemas/common';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { isValidIban, normalizeIban } from '@/lib/utils/iban';

import { getImportColumns, type ImportSystemColumn, normalizeKey } from './system-columns';
import type {
  ImportCell,
  ImportContext,
  ImportIssue,
  ImportLenderData,
  ImportLoanData,
  ImportLoanTemplate,
  ImportOpening,
  ImportRowResult,
  ImportSettings,
  ImportSummary,
  ImportTable,
  ImportTotals,
  ImportValidationResult,
} from './types';
import { cellText, matchOption, parseDate, parseNumber, parsePercent, round, valueKey } from './values';

export const MAX_IMPORT_ROWS = 5000;
const UNUSUAL_INTEREST_RATE = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIC_PATTERN = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

/** Key that marks two Kreditgeber*innen as probably the same person: name plus street or postcode. */
export function lenderNameKey(lender: {
  firstName?: string | null;
  lastName?: string | null;
  organisationName?: string | null;
  street?: string | null;
  zip?: string | null;
}): string | null {
  const name = normalizeKey(`${lender.organisationName ?? ''}${lender.firstName ?? ''}${lender.lastName ?? ''}`);
  const address = normalizeKey(`${lender.street ?? ''}${lender.zip ?? ''}`);
  return name && address ? `${name}|${address}` : null;
}

export function findLoanTemplate(context: ImportContext, templateId: string | null): ImportLoanTemplate | undefined {
  return (
    context.loanTemplates.find((template) => template.id === templateId) ??
    context.loanTemplates.find((template) => template.id === context.defaultLoanTemplateId)
  );
}

/** Default values a Kredit template provides. */
export const LOAN_TEMPLATE_KEYS = [
  'loan.terminationType',
  'loan.terminationPeriod',
  'loan.terminationPeriodType',
  'loan.duration',
  'loan.durationType',
  'loan.endDate',
] as const;

/** Termination defaults of a Kredit template, as canonical default values. */
export function loanTemplateDefaults(template: ImportLoanTemplate | undefined): Record<string, string> {
  if (!template) return {};
  const entries: [string, string | number | null][] = [
    ['loan.terminationType', template.terminationType],
    ['loan.terminationPeriod', template.terminationPeriod],
    ['loan.terminationPeriodType', template.terminationPeriodType],
    ['loan.duration', template.duration],
    ['loan.durationType', template.durationType],
    ['loan.endDate', template.endDate],
  ];
  return Object.fromEntries(entries.map(([key, value]) => [key, value === null ? '' : String(value)]));
}

const localIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Converts an additional field's configured default to a canonical default value. */
function additionalDefault(column: ImportSystemColumn): string {
  const config = column.additionalField?.config;
  const value = config?.defaultValue ?? '';
  if (!config || value === '') return config?.type === AdditionalFieldType.BOOLEAN ? 'false' : '';
  if (config.type === AdditionalFieldType.NUMBER) {
    const parsed = parseNumber({ t: 's', v: value }, ',');
    return parsed === null ? '' : String(parsed);
  }
  if (config.type === AdditionalFieldType.DATE) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : localIsoDate(date);
  }
  return value;
}

/** Default values a new Import starts with: the project's settings, its Kredit template and field defaults. */
export function getInitialDefaults(context: ImportContext, templateId: string | null): Record<string, string> {
  const defaults: Record<string, string> = {
    'lender.type': 'PERSON',
    'lender.salutation': context.lenderSalutation ?? '',
    'lender.country': context.lenderCountry ?? '',
    'lender.notificationType': 'ONLINE',
    'loan.interestPaymentType': 'YEARLY',
    'loan.interestMethod': context.interestMethod,
    'loan.contractStatus': 'COMPLETED',
    ...loanTemplateDefaults(findLoanTemplate(context, templateId)),
  };
  for (const column of getImportColumns(context)) {
    if (column.additionalField) defaults[column.key] = additionalDefault(column);
  }
  return Object.fromEntries(Object.entries(defaults).filter(([, value]) => value !== ''));
}

const germanNumber = (value: number, digits: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

/** Additional field values are stored the way the forms store them: German numbers, ISO timestamps of local dates. */
function storedAdditionalValue(column: ImportSystemColumn, value: string | number): string {
  const config = column.additionalField?.config;
  if (config?.type === AdditionalFieldType.NUMBER && typeof value === 'number') {
    return germanNumber(value, config.numberFormat === AdditionalNumberFormat.INTEGER ? 0 : 2);
  }
  if (config?.type === AdditionalFieldType.DATE && typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).toISOString();
  }
  return String(value);
}

const emptyTotals = (): ImportTotals => ({ loans: 0, amount: 0, kontostand: 0, einlagenstand: 0, zinsuebertrag: 0 });

const addToTotals = (totals: ImportTotals, loan: ImportLoanData, opening: ImportOpening) => {
  totals.loans += 1;
  totals.amount = round(totals.amount + loan.amount);
  totals.kontostand = round(totals.kontostand + opening.kontostand);
  totals.einlagenstand = round(totals.einlagenstand + opening.einlagenstand);
  totals.zinsuebertrag = round(totals.zinsuebertrag + opening.zinsuebertrag);
};

const LENDER_FIELDS = [
  'type',
  'salutation',
  'titlePrefix',
  'firstName',
  'lastName',
  'titleSuffix',
  'organisationName',
  'email',
  'telNo',
  'street',
  'addon',
  'zip',
  'place',
  'country',
  'iban',
  'bic',
  'notificationType',
] as const satisfies readonly (keyof ImportLenderData)[];

/**
 * Validates every row of an import file against the mapping, the default values and the project. Pure, so the
 * wizard runs it on every change and the server runs it again on the fresh project state before importing.
 */
export function validateImport(
  table: ImportTable,
  settings: ImportSettings,
  context: ImportContext,
): ImportValidationResult {
  const columns = getImportColumns(context);
  const columnsByKey = new Map(columns.map((entry) => [entry.key, entry]));
  const { decimalSeparator, dateOrder } = settings.format;
  const unknownValues: Record<string, Set<string>> = {};
  const allowedMethods = new Set<InterestMethod>([context.interestMethod, ...context.altInterestMethods]);
  const investmentTypeRates = new Set(context.investmentTypeRates.map(normalizeLoanInterestRate));

  const rows: ImportRowResult[] = table.rows.map((cells, index) => {
    const issues: ImportIssue[] = [];
    const error = (column: string | undefined, code: string, params?: ImportIssue['params']) =>
      issues.push({ severity: 'error', code, column, params });
    const warning = (column: string | undefined, code: string, params?: ImportIssue['params']) =>
      issues.push({ severity: 'warning', code, column, params });

    /** The file cell of a column, or the default as a canonical cell, or null. */
    const source = (key: string): { cell: ImportCell; fromDefault: boolean } | null => {
      const columnIndex = settings.columns[key];
      if (columnIndex !== undefined) {
        const cell = cells[columnIndex] ?? null;
        if (cellText(cell) !== '') return { cell, fromDefault: false };
      }
      const fallback = settings.defaults[key];
      return fallback ? { cell: { t: 's', v: fallback }, fromDefault: true } : null;
    };

    const text = (key: string) => {
      const found = source(key);
      return found ? cellText(found.cell) : null;
    };

    const number = (key: string, kind: 'int' | 'money' | 'percent' | 'number') => {
      const found = source(key);
      if (!found) return null;
      const separator = found.fromDefault ? '.' : decimalSeparator;
      const value = kind === 'percent' ? parsePercent(found.cell, separator) : parseNumber(found.cell, separator);
      if (value === null || (kind === 'int' && !Number.isInteger(value))) {
        error(key, kind === 'int' ? 'invalidInteger' : 'invalidNumber', { value: cellText(found.cell) });
        return null;
      }
      return kind === 'money' ? round(value) : value;
    };

    const date = (key: string) => {
      const found = source(key);
      if (!found) return null;
      const value = parseDate(found.cell, found.fromDefault ? 'YMD' : dateOrder);
      if (value === null) error(key, 'invalidDate', { value: cellText(found.cell) });
      return value;
    };

    const choice = <T extends string>(key: string): T | null => {
      const found = source(key);
      const options = columnsByKey.get(key)?.options;
      if (!found || !options) return null;
      const value = cellText(found.cell);
      if (found.fromDefault) {
        if (value in options) return value as T;
        error(key, 'unknownValue', { value });
        return null;
      }
      const assigned = settings.valueAssignments[key]?.[valueKey(value)];
      const matched = assigned || matchOption(value, options);
      if (matched) return matched as T;
      unknownValues[key] ??= new Set();
      unknownValues[key].add(value);
      error(key, 'unknownValue', { value });
      return null;
    };

    const required = <T>(key: string, value: T | null): value is T => {
      if (value === null || value === '') {
        if (!issues.some((issue) => issue.column === key)) error(key, 'required');
        return false;
      }
      return true;
    };

    const additionalFields = (scope: 'lender' | 'loan') => {
      const values: Record<string, string> = {};
      for (const column of columns) {
        if (column.additionalField?.scope !== scope) continue;
        const { config } = column.additionalField;
        let value: string | number | null;
        switch (column.kind) {
          case 'int':
          case 'money':
          case 'percent':
          case 'number':
            value = number(column.key, column.kind);
            break;
          case 'date':
            value = date(column.key);
            break;
          case 'choice':
          case 'boolean':
            value = choice(column.key);
            break;
          default:
            value = text(column.key);
        }
        if (value === null || value === '') {
          if (config.required) required(column.key, null);
          continue;
        }
        values[config.id] = storedAdditionalValue(column, value);
      }
      return values;
    };

    // Kreditgeber*in
    const lenderNumber = number('lender.lenderNumber', 'int');
    if (lenderNumber !== null && lenderNumber < 1)
      error('lender.lenderNumber', 'invalidInteger', { value: lenderNumber });
    const type = choice<LenderType>('lender.type');
    const salutation = choice<Salutation>('lender.salutation');
    const country = choice<Country>('lender.country');
    const notificationType = choice<NotificationType>('lender.notificationType');
    const rawEmail = text('lender.email');
    const email = rawEmail ? rawEmail.toLowerCase() : null;
    if (email && !EMAIL_PATTERN.test(email)) error('lender.email', 'invalidEmail', { value: rawEmail ?? '' });
    const rawIban = text('lender.iban');
    const iban = rawIban ? normalizeIban(rawIban) : null;
    if (rawIban && !isValidIban(rawIban)) error('lender.iban', 'invalidIban', { value: rawIban });
    const bic = text('lender.bic')?.replace(/\s/g, '').toUpperCase() || null;
    if (bic && !BIC_PATTERN.test(bic)) error('lender.bic', 'invalidBic', { value: bic });
    const lenderText = {
      titlePrefix: text('lender.titlePrefix'),
      firstName: text('lender.firstName'),
      lastName: text('lender.lastName'),
      titleSuffix: text('lender.titleSuffix'),
      organisationName: text('lender.organisationName'),
      telNo: text('lender.telNo'),
      street: text('lender.street'),
      addon: text('lender.addon'),
      zip: text('lender.zip'),
      place: text('lender.place'),
    };
    required('lender.type', type);
    required('lender.salutation', salutation);
    required('lender.country', country);
    required('lender.notificationType', notificationType);
    if (type === 'PERSON') {
      required('lender.firstName', lenderText.firstName);
      required('lender.lastName', lenderText.lastName);
    } else if (type === 'ORGANISATION') {
      required('lender.organisationName', lenderText.organisationName);
    }
    const addressStarted = !!(lenderText.street || lenderText.zip || lenderText.place || lenderText.addon);
    if (addressStarted || context.lenderRequiredFields.includes('address')) {
      for (const key of ['street', 'zip', 'place'] as const) {
        if (!lenderText[key]) {
          if (addressStarted) error(`lender.${key}`, 'addressIncomplete');
          else required(`lender.${key}`, null);
        }
      }
    }
    if (context.lenderRequiredFields.includes('email')) required('lender.email', email);
    if (context.lenderRequiredFields.includes('telNo')) required('lender.telNo', lenderText.telNo);
    const lenderAdditionalFields = additionalFields('lender');

    // Kredit
    const loanNumber = number('loan.loanNumber', 'int');
    if (loanNumber !== null && loanNumber < 1) error('loan.loanNumber', 'invalidInteger', { value: loanNumber });
    const signDate = date('loan.signDate');
    const amount = number('loan.amount', 'money');
    const interestRate = number('loan.interestRate', 'percent');
    const interestPaymentType = choice<InterestPaymentType>('loan.interestPaymentType');
    const interestMethod = choice<InterestMethod>('loan.interestMethod');
    const contractStatus = choice<ContractStatus>('loan.contractStatus');
    const terminationType = choice<TerminationType>('loan.terminationType');
    required('loan.signDate', signDate);
    if (required('loan.amount', amount) && amount <= 0) error('loan.amount', 'notPositive');
    if (required('loan.interestRate', interestRate) && (interestRate < 0 || interestRate > UNUSUAL_INTEREST_RATE)) {
      warning('loan.interestRate', 'interestRateUnusual', { value: interestRate });
    }
    required('loan.interestPaymentType', interestPaymentType);
    if (required('loan.interestMethod', interestMethod) && !allowedMethods.has(interestMethod)) {
      error('loan.interestMethod', 'interestMethodNotAllowed', { value: interestMethod });
    }
    required('loan.contractStatus', contractStatus);
    required('loan.terminationType', terminationType);

    let endDate: string | null = null;
    let terminationDate: string | null = null;
    let terminationPeriod: number | null = null;
    let terminationPeriodType: DurationType | null = null;
    let duration: number | null = null;
    let durationType: DurationType | null = null;
    if (terminationType === 'ENDDATE') {
      endDate = date('loan.endDate');
      required('loan.endDate', endDate);
    } else if (terminationType === 'TERMINATION') {
      terminationPeriod = number('loan.terminationPeriod', 'int');
      terminationPeriodType = choice<DurationType>('loan.terminationPeriodType');
      terminationDate = date('loan.terminationDate');
      if (required('loan.terminationPeriod', terminationPeriod) && terminationPeriod < 1) {
        error('loan.terminationPeriod', 'notPositive');
      }
      required('loan.terminationPeriodType', terminationPeriodType);
    } else if (terminationType === 'DURATION') {
      duration = number('loan.duration', 'int');
      durationType = choice<DurationType>('loan.durationType');
      if (required('loan.duration', duration) && duration < 1) error('loan.duration', 'notPositive');
      required('loan.durationType', durationType);
    }
    if (terminationType && terminationType !== 'TERMINATION' && source('loan.terminationDate')?.fromDefault === false) {
      warning('loan.terminationDate', 'terminationDateIgnored');
    }
    const loanAdditionalFields = additionalFields('loan');

    let investmentTypeRate: number | null = null;
    if (context.deInvestmentActCompliance && country === 'DE' && interestRate !== null) {
      investmentTypeRate = normalizeLoanInterestRate(interestRate);
      if (!investmentTypeRates.has(investmentTypeRate)) {
        error('loan.interestRate', 'noInvestmentType', { value: interestRate });
      }
    }

    // Opening state on the Stichtag
    const stichtag = date('opening.stichtag');
    const kontostand = number('opening.kontostand', 'money');
    const einlagenstandValue = number('opening.einlagenstand', 'money');
    required('opening.stichtag', stichtag);
    required('opening.kontostand', kontostand);
    const einlagenstand = einlagenstandValue ?? kontostand;
    if (kontostand !== null && kontostand < 0) error('opening.kontostand', 'negative');
    if (einlagenstandValue !== null && einlagenstandValue < 0) error('opening.einlagenstand', 'negative');
    if (kontostand !== null && einlagenstand !== null && einlagenstand > kontostand) {
      error('opening.einlagenstand', 'einlagenstandAboveKontostand');
    }
    if (amount !== null && einlagenstand !== null && einlagenstand > amount) {
      error('opening.einlagenstand', 'einlagenstandAboveAmount', { amount });
    }
    if (kontostand === 0) warning('opening.kontostand', 'noKontostand');
    if (stichtag && signDate && stichtag < signDate) error('opening.stichtag', 'stichtagBeforeSignDate');
    // 31 Dec and 1 Jan both start the next Zinsjahr from the full Kontostand; any other day splits a year.
    if (stichtag && !stichtag.endsWith('-12-31') && !stichtag.endsWith('-01-01')) {
      warning('opening.stichtag', 'stichtagNotYearEnd');
    }
    if (stichtag && stichtag > context.today) warning('opening.stichtag', 'stichtagInFuture');

    const lenderNote = text('lender.note');
    const loanNote = text('loan.note');
    const hasErrors = issues.some((issue) => issue.severity === 'error');

    const lender: ImportLenderData | null = hasErrors
      ? null
      : {
          lenderNumber: lenderNumber ?? 0,
          type: type as LenderType,
          salutation: salutation as Salutation,
          ...lenderText,
          firstName: type === 'PERSON' ? lenderText.firstName : null,
          lastName: type === 'PERSON' ? lenderText.lastName : null,
          organisationName: type === 'ORGANISATION' ? lenderText.organisationName : null,
          email,
          country: country as Country,
          iban,
          bic,
          notificationType: notificationType as NotificationType,
          additionalFields: lenderAdditionalFields,
        };

    const loan: ImportLoanData | null = hasErrors
      ? null
      : {
          loanNumber: loanNumber ?? 0,
          signDate: signDate as string,
          amount: amount as number,
          interestRate: interestRate as number,
          interestPaymentType: interestPaymentType as InterestPaymentType,
          interestMethod: interestMethod as InterestMethod,
          contractStatus: contractStatus as ContractStatus,
          terminationType: terminationType as TerminationType,
          endDate,
          terminationDate,
          terminationPeriod,
          terminationPeriodType,
          duration,
          durationType,
          additionalFields: loanAdditionalFields,
          investmentTypeRate,
        };

    const opening: ImportOpening | null =
      hasErrors || kontostand === null || einlagenstand === null || stichtag === null
        ? null
        : { stichtag, kontostand, einlagenstand, zinsuebertrag: round(kontostand - einlagenstand) };

    return {
      index,
      rowNumber: table.rowNumbers[index] ?? index + 2,
      lenderGroup: lenderNumber !== null ? `number:${lenderNumber}` : `row:${index}`,
      lender,
      loan,
      opening,
      lenderNote,
      loanNote,
      issues,
      // Kept for the cross-row checks below; dropped from the result.
      _lenderNumber: lenderNumber,
      _loanNumber: loanNumber,
      _email: email,
      _nameKey: lenderNameKey(lenderText),
      _lenderValues: { type, salutation, ...lenderText, email, country, iban, bic, notificationType },
      _lenderAdditional: lenderAdditionalFields,
    } as ImportRowResult & RowScratch;
  });

  checkAcrossRows(rows as (ImportRowResult & RowScratch)[], context, columns);

  const issues: ImportIssue[] = [];
  if (table.rows.length === 0) issues.push({ severity: 'error', code: 'noRows' });
  if (table.rows.length > MAX_IMPORT_ROWS) {
    issues.push({ severity: 'error', code: 'tooManyRows', params: { max: MAX_IMPORT_ROWS } });
  }
  const startOfYear = `${context.today.slice(0, 4)}-01-01`;
  if (!context.hasHistoricTransactions && rows.some((row) => row.opening && row.opening.stichtag < startOfYear)) {
    issues.push({ severity: 'warning', code: 'interestMethodLocks' });
  }

  const cleanRows = (rows as (ImportRowResult & RowScratch)[]).map(
    ({ _lenderNumber, _loanNumber, _email, _nameKey, _lenderValues, _lenderAdditional, ...row }) => {
      if (row.issues.some((issue) => issue.severity === 'error')) {
        return { ...row, lender: null, loan: null, opening: null };
      }
      return row;
    },
  );

  return {
    rows: cleanRows,
    issues,
    unknownValues: Object.fromEntries(Object.entries(unknownValues).map(([key, values]) => [key, [...values].sort()])),
    columnCounts: countByColumn(cleanRows),
    summary: summarize(cleanRows, issues),
  };
}

type RowScratch = {
  _lenderNumber: number | null;
  _loanNumber: number | null;
  _email: string | null;
  _nameKey: string | null;
  _lenderValues: Record<string, unknown>;
  _lenderAdditional: Record<string, string>;
};

const rowList = (rows: { rowNumber: number }[]) => rows.map((row) => row.rowNumber).join(', ');

/** Checks that need several rows or the project: numbers, Kreditgeber*in groups and likely duplicates. */
function checkAcrossRows(
  rows: (ImportRowResult & RowScratch)[],
  context: ImportContext,
  columns: ImportSystemColumn[],
) {
  const existingLenderNumbers = new Set(context.existingLenderNumbers);
  const existingLoanNumbers = new Set(context.existingLoanNumbers);
  const existingEmails = new Set(context.existingLenderEmails);
  const existingNameKeys = new Set(context.existingLenderNameKeys);

  // Rows of one Kreditgeber*in must agree on the Kreditgeber*in's data.
  const groups = new Map<string, (ImportRowResult & RowScratch)[]>();
  for (const row of rows) {
    const group = groups.get(row.lenderGroup) ?? [];
    group.push(row);
    groups.set(row.lenderGroup, group);
  }
  const lenderFieldColumns = columns.filter((entry) => entry.additionalField?.scope === 'lender');
  for (const group of groups.values()) {
    const [first, ...others] = group;
    if (!first) continue;
    for (const row of others) {
      const differing = new Set<string>();
      for (const field of LENDER_FIELDS) {
        if ((first._lenderValues[field] ?? null) !== (row._lenderValues[field] ?? null))
          differing.add(`lender.${field}`);
      }
      for (const column of lenderFieldColumns) {
        const id = column.additionalField?.config.id ?? '';
        if ((first._lenderAdditional[id] ?? '') !== (row._lenderAdditional[id] ?? '')) differing.add(column.key);
      }
      for (const column of differing) {
        row.issues.push({
          severity: 'error',
          code: 'lenderDataDiffers',
          column,
          params: { row: first.rowNumber, number: first._lenderNumber ?? '' },
        });
      }
    }
    if (first._lenderNumber !== null && existingLenderNumbers.has(first._lenderNumber)) {
      for (const row of group) {
        row.issues.push({
          severity: 'error',
          code: 'lenderNumberExists',
          column: 'lender.lenderNumber',
          params: { number: first._lenderNumber },
        });
      }
    }
  }

  // Kreditnummern must be new and unique.
  const byLoanNumber = new Map<number, (ImportRowResult & RowScratch)[]>();
  for (const row of rows) {
    if (row._loanNumber === null) continue;
    const list = byLoanNumber.get(row._loanNumber) ?? [];
    list.push(row);
    byLoanNumber.set(row._loanNumber, list);
  }
  for (const [loanNumber, list] of byLoanNumber) {
    for (const row of list) {
      if (existingLoanNumbers.has(loanNumber)) {
        row.issues.push({
          severity: 'error',
          code: 'loanNumberExists',
          column: 'loan.loanNumber',
          params: { number: loanNumber },
        });
      }
      if (list.length > 1) {
        row.issues.push({
          severity: 'error',
          code: 'loanNumberDuplicate',
          column: 'loan.loanNumber',
          params: { number: loanNumber, rows: rowList(list.filter((other) => other !== row)) },
        });
      }
    }
  }

  // Likely duplicates of existing Kreditgeber*innen, or of another Kreditgeber*in in the file.
  const groupsByEmail = new Map<string, Set<string>>();
  const groupsByNameKey = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row._email) groupsByEmail.set(row._email, (groupsByEmail.get(row._email) ?? new Set()).add(row.lenderGroup));
    if (row._nameKey) {
      groupsByNameKey.set(row._nameKey, (groupsByNameKey.get(row._nameKey) ?? new Set()).add(row.lenderGroup));
    }
  }
  for (const row of rows) {
    if ((row._email && existingEmails.has(row._email)) || (row._nameKey && existingNameKeys.has(row._nameKey))) {
      row.issues.push({ severity: 'warning', code: 'lenderExists', column: row._email ? 'lender.email' : undefined });
    }
    const sameEmail = row._email ? (groupsByEmail.get(row._email)?.size ?? 0) > 1 : false;
    const sameName = row._nameKey ? (groupsByNameKey.get(row._nameKey)?.size ?? 0) > 1 : false;
    if (sameEmail || sameName) {
      const others = rows.filter(
        (other) =>
          other.lenderGroup !== row.lenderGroup &&
          ((sameEmail && other._email === row._email) || (sameName && other._nameKey === row._nameKey)),
      );
      row.issues.push({
        severity: 'warning',
        code: 'lenderDuplicateInFile',
        column: sameEmail ? 'lender.email' : undefined,
        params: { rows: rowList(others) },
      });
    }
  }

  // Numbers for rows without one: after the highest number in the project and in the file.
  let nextLenderNumber =
    Math.max(0, ...context.existingLenderNumbers, ...rows.map((row) => row._lenderNumber ?? 0)) + 1;
  let nextLoanNumber = Math.max(0, ...context.existingLoanNumbers, ...rows.map((row) => row._loanNumber ?? 0)) + 1;
  const assignedLenderNumbers = new Map<string, number>();
  for (const row of rows) {
    let lenderNumber = row._lenderNumber ?? assignedLenderNumbers.get(row.lenderGroup);
    if (lenderNumber === undefined) {
      lenderNumber = nextLenderNumber++;
    }
    assignedLenderNumbers.set(row.lenderGroup, lenderNumber);
    if (row.lender) row.lender.lenderNumber = lenderNumber;
    const loanNumber = row._loanNumber ?? nextLoanNumber++;
    if (row.loan) row.loan.loanNumber = loanNumber;
  }
}

function countByColumn(rows: ImportRowResult[]) {
  const counts: Record<string, { errors: number; warnings: number }> = {};
  for (const row of rows) {
    for (const issue of row.issues) {
      if (!issue.column) continue;
      counts[issue.column] ??= { errors: 0, warnings: 0 };
      if (issue.severity === 'error') counts[issue.column].errors++;
      else counts[issue.column].warnings++;
    }
  }
  return counts;
}

function summarize(rows: ImportRowResult[], issues: ImportIssue[]): ImportSummary {
  const totals = emptyTotals();
  const byStichtag = new Map<string, ImportTotals>();
  const lenders = new Set<string>();
  let errors = issues.filter((issue) => issue.severity === 'error').length;
  let warnings = issues.filter((issue) => issue.severity === 'warning').length;
  for (const row of rows) {
    errors += row.issues.filter((issue) => issue.severity === 'error').length;
    warnings += row.issues.filter((issue) => issue.severity === 'warning').length;
    lenders.add(row.lenderGroup);
    if (!row.loan || !row.opening) continue;
    addToTotals(totals, row.loan, row.opening);
    const entry = byStichtag.get(row.opening.stichtag) ?? emptyTotals();
    addToTotals(entry, row.loan, row.opening);
    byStichtag.set(row.opening.stichtag, entry);
  }
  return {
    lenders: lenders.size,
    loans: rows.length,
    rows: rows.length,
    errors,
    warnings,
    totals,
    byStichtag: [...byStichtag.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([stichtag, entry]) => ({ stichtag, ...entry })),
  };
}
