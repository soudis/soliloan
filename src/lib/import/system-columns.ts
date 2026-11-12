import {
  ContractStatus,
  Country,
  DurationType,
  type InterestMethod,
  InterestPaymentType,
  LenderType,
  NotificationType,
  Salutation,
  TerminationType,
} from '@prisma/client';
import { type AdditionalFieldConfig, AdditionalFieldType, AdditionalNumberFormat } from '@/lib/schemas/common';

import type { ImportContext } from './types';

export type ImportColumnKind =
  | 'text'
  | 'int'
  | 'money'
  | 'percent'
  | 'number'
  | 'date'
  | 'email'
  | 'iban'
  | 'bic'
  | 'choice'
  | 'boolean';

export type ImportColumnGroup = 'lender' | 'loan' | 'opening';

export type ImportSystemColumn = {
  key: string;
  group: ImportColumnGroup;
  kind: ImportColumnKind;
  /** Header names that select this column automatically. */
  synonyms: string[];
  /** Canonical values of a choice column, with the file values that mean them. */
  options?: Record<string, string[]>;
  /** Set for additional fields; their label is the configured name. */
  additionalField?: { scope: 'lender' | 'loan'; config: AdditionalFieldConfig };
};

/** Lower case, umlauts spelled out, everything but letters and digits removed. */
export const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');

const COUNTRY_NAMES: Record<Country, string[]> = {
  DE: ['Deutschland', 'Germany', 'BRD', 'D'],
  AT: ['Österreich', 'Austria', 'A'],
  CH: ['Schweiz', 'Switzerland'],
  US: ['USA', 'Vereinigte Staaten', 'United States'],
  GB: ['Großbritannien', 'Vereinigtes Königreich', 'United Kingdom', 'UK'],
  FR: ['Frankreich', 'France'],
  IT: ['Italien', 'Italy'],
  ES: ['Spanien', 'Spain'],
  NL: ['Niederlande', 'Netherlands', 'Holland'],
  BE: ['Belgien', 'Belgium'],
  DK: ['Dänemark', 'Denmark'],
  SE: ['Schweden', 'Sweden'],
  NO: ['Norwegen', 'Norway'],
  FI: ['Finnland', 'Finland'],
  PL: ['Polen', 'Poland'],
  CZ: ['Tschechien', 'Tschechische Republik', 'Czechia', 'Czech Republic'],
  HU: ['Ungarn', 'Hungary'],
  RO: ['Rumänien', 'Romania'],
  BG: ['Bulgarien', 'Bulgaria'],
  HR: ['Kroatien', 'Croatia'],
  SI: ['Slowenien', 'Slovenia'],
  SK: ['Slowakei', 'Slovakia'],
  EE: ['Estland', 'Estonia'],
  LV: ['Lettland', 'Latvia'],
  LT: ['Litauen', 'Lithuania'],
  CY: ['Zypern', 'Cyprus'],
  MT: ['Malta'],
  LU: ['Luxemburg', 'Luxembourg'],
  IE: ['Irland', 'Ireland'],
  PT: ['Portugal'],
  GR: ['Griechenland', 'Greece'],
};

const INTEREST_METHOD_NAMES: Record<InterestMethod, string[]> = {
  ACT_365_NOCOMPOUND: ['ACT/365', 'act/365 ohne Zinseszins', 'act/365 einfach'],
  E30_360_NOCOMPOUND: ['30/360', '30E/360', '30/360 ohne Zinseszins', '30/360 einfach'],
  ACT_360_NOCOMPOUND: ['ACT/360', 'act/360 ohne Zinseszins', 'act/360 einfach'],
  ACT_ACT_NOCOMPOUND: ['ACT/ACT', 'act/act ohne Zinseszins', 'act/act einfach'],
  ACT_365_COMPOUND: ['ACT/365 mit Zinseszins', 'act/365 compound'],
  E30_360_COMPOUND: ['30/360 mit Zinseszins', '30E/360 mit Zinseszins', '30/360 compound'],
  ACT_360_COMPOUND: ['ACT/360 mit Zinseszins', 'act/360 compound'],
  ACT_ACT_COMPOUND: ['ACT/ACT mit Zinseszins', 'act/act compound'],
};

const withCodes = <T extends string>(names: Record<T, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries<string[]>(names).map(([value, labels]) => [value, [value, ...labels]]));

const enumOptions = <T extends string>(values: Record<string, T>, names: Partial<Record<T, string[]>>) =>
  withCodes(
    Object.fromEntries(Object.values(values).map((value) => [value, names[value] ?? []])) as Record<T, string[]>,
  );

export const BOOLEAN_OPTIONS: Record<string, string[]> = {
  true: ['true', 'ja', 'yes', 'j', 'y', 'x', '1', 'wahr'],
  false: ['false', 'nein', 'no', 'n', '0', 'falsch'],
};

const column = (
  group: ImportColumnGroup,
  name: string,
  kind: ImportColumnKind,
  synonyms: string[],
  options?: Record<string, string[]>,
): ImportSystemColumn => ({ key: `${group}.${name}`, group, kind, synonyms: [name, ...synonyms], options });

/** The system columns of the Kreditgeber*in, the Kredit and the opening state, without additional fields. */
export const BASE_COLUMNS: ImportSystemColumn[] = [
  column('lender', 'lenderNumber', 'int', [
    'Kreditgeber*innen-Nummer',
    'Kreditgebernummer',
    'Kreditgeber Nr',
    'Kreditgeber-Nr.',
    'KG-Nr',
    'Nummer Kreditgeber',
    'Lender number',
    'Lender no',
    'user_id',
    'contract_user_id',
  ]),
  column(
    'lender',
    'type',
    'choice',
    ['Typ', 'Art', 'Personentyp', 'Type', 'user_type'],
    enumOptions(LenderType, {
      PERSON: ['Person', 'Privatperson', 'natürliche Person', 'privat', 'Individual', 'natural person', 'P'],
      ORGANISATION: [
        'Organisation',
        'Organization',
        'Firma',
        'Verein',
        'Unternehmen',
        'Company',
        'juristische Person',
        'O',
      ],
    }),
  ),
  column(
    'lender',
    'salutation',
    'choice',
    ['Anrede', 'Ansprache', 'Salutation'],
    enumOptions(Salutation, {
      PERSONAL: ['du', 'per du', 'persönlich', 'personal', 'informal', 'informell'],
      FORMAL: ['Sie', 'per Sie', 'förmlich', 'formell', 'formal'],
    }),
  ),
  column('lender', 'titlePrefix', 'text', ['Titel', 'Titel vorne', 'Titel vorangestellt', 'Title', 'title_prefix']),
  column('lender', 'firstName', 'text', ['Vorname', 'First name', 'Given name', 'first_name']),
  column('lender', 'lastName', 'text', ['Nachname', 'Familienname', 'Zuname', 'Last name', 'Surname', 'last_name']),
  column('lender', 'titleSuffix', 'text', ['Titel nachgestellt', 'Titel hinten', 'Title suffix', 'title_suffix']),
  column('lender', 'organisationName', 'text', [
    'Organisation',
    'Organisationsname',
    'Firma',
    'Firmenname',
    'Verein',
    'Organization',
    'Organisation name',
    'Company',
  ]),
  column('lender', 'email', 'email', ['E-Mail', 'Email', 'Mail', 'E-Mail-Adresse', 'Email address']),
  column('lender', 'telNo', 'text', ['Telefon', 'Telefonnummer', 'Tel', 'Tel.', 'Handy', 'Phone', 'telno']),
  column('lender', 'street', 'text', ['Straße', 'Strasse', 'Adresse', 'Straße und Hausnummer', 'Street', 'Address']),
  column('lender', 'addon', 'text', ['Adresszusatz', 'Zusatz', 'c/o', 'Address line 2']),
  column('lender', 'zip', 'text', ['PLZ', 'Postleitzahl', 'ZIP', 'Postal code', 'Postcode']),
  column('lender', 'place', 'text', ['Ort', 'Stadt', 'Wohnort', 'City', 'Town']),
  column('lender', 'country', 'choice', ['Land', 'Staat', 'Country'], enumOptions(Country, COUNTRY_NAMES)),
  column('lender', 'iban', 'iban', ['IBAN', 'Kontonummer']),
  column('lender', 'bic', 'bic', ['BIC', 'SWIFT']),
  column(
    'lender',
    'notificationType',
    'choice',
    ['Benachrichtigungsart', 'Benachrichtigung', 'Zustellung', 'Notification', 'account_notification_type'],
    enumOptions(NotificationType, {
      ONLINE: ['online', 'Portal'],
      EMAIL: ['E-Mail', 'Email', 'Mail'],
      POST: ['Post', 'Brief', 'postalisch', 'Letter', 'Mail (postal)'],
    }),
  ),
  column('lender', 'note', 'text', [
    'Notiz Kreditgeber*in',
    'Notiz Kreditgeber',
    'Anmerkung Kreditgeber',
    'Lender note',
  ]),

  column('loan', 'loanNumber', 'int', [
    'Kreditnummer',
    'Kredit-Nr',
    'Kredit Nr.',
    'Vertragsnummer',
    'Vertrags-Nr',
    'Loan number',
    'Contract number',
    'contract_id',
  ]),
  column('loan', 'signDate', 'date', [
    'Vertragsdatum',
    'Unterschrieben am',
    'Datum Vertrag',
    'Abschlussdatum',
    'Sign date',
    'Contract date',
    'sign_date',
  ]),
  column('loan', 'amount', 'money', ['Kreditbetrag', 'Betrag', 'Vertragswert', 'Kreditsumme', 'Amount', 'Loan amount']),
  column('loan', 'interestRate', 'percent', ['Zinssatz', 'Zins', 'Zinsen %', 'Interest rate', 'interest_rate']),
  column(
    'loan',
    'interestPaymentType',
    'choice',
    ['Zinsauszahlung', 'Auszahlung Zinsen', 'Interest payment', 'interest_payment_type'],
    enumOptions(InterestPaymentType, {
      YEARLY: ['jährlich', 'jährl.', 'jedes Jahr', 'yearly', 'annual', 'annually'],
      END: ['Ende', 'am Ende', 'endfällig', 'Laufzeitende', 'end', 'end of term'],
    }),
  ),
  column(
    'loan',
    'interestMethod',
    'choice',
    ['Zinsmethode', 'Zinsberechnung', 'Interest method', 'interest_method'],
    withCodes(INTEREST_METHOD_NAMES),
  ),
  column(
    'loan',
    'contractStatus',
    'choice',
    ['Vertragsstatus', 'Status', 'Vertrag', 'Contract status'],
    enumOptions(ContractStatus, {
      PENDING: ['offen', 'ausstehend', 'nicht unterschrieben', 'pending', 'nein', 'no'],
      COMPLETED: ['abgeschlossen', 'unterschrieben', 'vollständig', 'erledigt', 'completed', 'signed', 'ja', 'yes'],
    }),
  ),
  column(
    'loan',
    'terminationType',
    'choice',
    ['Kündigungsart', 'Laufzeitart', 'Vertragsende', 'Termination type', 'termination_type'],
    enumOptions(TerminationType, {
      TERMINATION: ['Kündigung', 'Kündigungsfrist', 'unbefristet', 'termination', 'notice'],
      ENDDATE: ['Enddatum', 'Ende', 'fixes Enddatum', 'befristet', 'end date'],
      DURATION: ['Laufzeit', 'feste Laufzeit', 'duration', 'term'],
    }),
  ),
  column('loan', 'terminationDate', 'date', ['Kündigungsdatum', 'Gekündigt am', 'Kündigung am', 'Termination date']),
  column('loan', 'terminationPeriod', 'int', ['Kündigungsfrist', 'Termination period', 'termination_period']),
  column(
    'loan',
    'terminationPeriodType',
    'choice',
    ['Einheit Kündigungsfrist', 'Kündigungsfrist Einheit', 'Termination period type', 'termination_period_type'],
    durationOptions(),
  ),
  column('loan', 'endDate', 'date', ['Enddatum', 'Laufzeitende', 'Vertragsende Datum', 'End date']),
  column('loan', 'duration', 'int', ['Laufzeit', 'Dauer', 'Duration']),
  column(
    'loan',
    'durationType',
    'choice',
    ['Einheit Laufzeit', 'Laufzeit Einheit', 'Duration type'],
    durationOptions(),
  ),
  column('loan', 'note', 'text', ['Notiz Kredit', 'Notiz Vertrag', 'Anmerkung Kredit', 'Loan note', 'contract_notes']),

  column('opening', 'stichtag', 'date', ['Stichtag', 'Datum Stand', 'Stand am', 'Cut-off date', 'Balance date']),
  column('opening', 'kontostand', 'money', [
    'Kontostand',
    'Stand',
    'Saldo',
    'Kontostand inkl. Zinsen',
    'Guthaben',
    'Balance',
    'contract_deposit_amount',
  ]),
  column('opening', 'einlagenstand', 'money', [
    'Einlagenstand',
    'Einlage',
    'Einlagen',
    'Kontostand ohne Zinsen',
    'Netto-Einzahlungen',
    'Kapital',
    'Balance without interest',
  ]),
];

function durationOptions() {
  return enumOptions(DurationType, {
    MONTHS: ['Monate', 'Monat', 'M', 'months', 'month'],
    YEARS: ['Jahre', 'Jahr', 'J', 'years', 'year', 'Y'],
  });
}

const additionalColumn = (scope: 'lender' | 'loan', config: AdditionalFieldConfig): ImportSystemColumn => {
  const kind: ImportColumnKind =
    config.type === AdditionalFieldType.NUMBER
      ? config.numberFormat === AdditionalNumberFormat.INTEGER
        ? 'int'
        : config.numberFormat === AdditionalNumberFormat.PERCENT
          ? 'percent'
          : config.numberFormat === AdditionalNumberFormat.MONEY
            ? 'money'
            : 'number'
      : config.type === AdditionalFieldType.DATE
        ? 'date'
        : config.type === AdditionalFieldType.SELECT
          ? 'choice'
          : config.type === AdditionalFieldType.BOOLEAN
            ? 'boolean'
            : 'text';
  return {
    key: `${scope}Field.${config.id}`,
    group: scope,
    kind,
    synonyms: [config.name],
    options:
      config.type === AdditionalFieldType.SELECT
        ? Object.fromEntries(config.selectOptions.map((option) => [option, [option]]))
        : config.type === AdditionalFieldType.BOOLEAN
          ? BOOLEAN_OPTIONS
          : undefined,
    additionalField: { scope, config },
  };
};

/** All system columns of a project: the base columns plus its Kreditgeber*in and Kredit additional fields. */
export function getImportColumns(
  context: Pick<ImportContext, 'lenderAdditionalFields' | 'loanAdditionalFields'>,
): ImportSystemColumn[] {
  const lenderFields = context.lenderAdditionalFields.map((config) => additionalColumn('lender', config));
  const loanFields = context.loanAdditionalFields.map((config) => additionalColumn('loan', config));
  const lenderEnd = BASE_COLUMNS.findIndex((entry) => entry.key === 'lender.note');
  const loanEnd = BASE_COLUMNS.findIndex((entry) => entry.key === 'loan.note');
  return [
    ...BASE_COLUMNS.slice(0, lenderEnd),
    ...lenderFields,
    ...BASE_COLUMNS.slice(lenderEnd, loanEnd),
    ...loanFields,
    ...BASE_COLUMNS.slice(loanEnd),
  ];
}

/**
 * Assigns file columns to system columns by header name. A header matches when its normalised form equals the
 * normalised form of a synonym; each file column is used at most once, in the order of the system columns.
 */
export function guessColumnMapping(headers: string[], columns: ImportSystemColumn[]): Record<string, number> {
  const normalizedHeaders = headers.map(normalizeKey);
  const used = new Set<number>();
  const mapping: Record<string, number> = {};
  for (const systemColumn of columns) {
    const synonyms = new Set(systemColumn.synonyms.map(normalizeKey));
    const index = normalizedHeaders.findIndex((header, i) => !used.has(i) && header !== '' && synonyms.has(header));
    if (index >= 0) {
      mapping[systemColumn.key] = index;
      used.add(index);
    }
  }
  return mapping;
}

/**
 * Restores a mapping saved with an earlier Import onto a new file by header name. Columns whose header is no longer
 * in the file are left out.
 */
export function restoreColumnMapping(
  saved: Record<string, number>,
  savedHeaders: string[],
  headers: string[],
): Record<string, number> {
  const restored: Record<string, number> = {};
  for (const [key, index] of Object.entries(saved)) {
    const header = savedHeaders[index];
    if (header === undefined) continue;
    const newIndex = headers.indexOf(header);
    if (newIndex >= 0) restored[key] = newIndex;
  }
  return restored;
}
