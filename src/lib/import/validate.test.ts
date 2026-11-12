import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AdditionalFieldType, type AdditionalFieldConfig } from '@/lib/schemas/common';

import type { ImportContext, ImportSettings, ImportTable } from './types';
import { getInitialDefaults, validateImport } from './validate';
import { DEFAULT_IMPORT_FORMAT } from './values';

const context = (overrides: Partial<ImportContext> = {}): ImportContext => ({
  interestMethod: 'ACT_365_NOCOMPOUND',
  altInterestMethods: [],
  lenderSalutation: 'FORMAL',
  lenderCountry: 'AT',
  lenderRequiredFields: [],
  deInvestmentActCompliance: false,
  lenderAdditionalFields: [],
  loanAdditionalFields: [],
  loanTemplates: [
    {
      id: 'tpl',
      name: 'Standard',
      terminationType: 'TERMINATION',
      terminationPeriod: 6,
      terminationPeriodType: 'MONTHS',
      duration: null,
      durationType: null,
      endDate: null,
    },
  ],
  defaultLoanTemplateId: 'tpl',
  existingLenderNumbers: [],
  existingLoanNumbers: [],
  existingLenderEmails: [],
  existingLenderNameKeys: [],
  investmentTypeRates: [],
  hasHistoricTransactions: true,
  today: '2026-03-01',
  ...overrides,
});

const HEADERS = [
  'Nr',
  'Vorname',
  'Nachname',
  'E-Mail',
  'Vertragsdatum',
  'Betrag',
  'Zinssatz',
  'Kontostand',
  'Einlagenstand',
];
const COLUMNS = {
  'lender.lenderNumber': 0,
  'lender.firstName': 1,
  'lender.lastName': 2,
  'lender.email': 3,
  'loan.signDate': 4,
  'loan.amount': 5,
  'loan.interestRate': 6,
  'opening.kontostand': 7,
  'opening.einlagenstand': 8,
};

const table = (rows: string[][]): ImportTable => ({
  headers: HEADERS,
  rows: rows.map((row) => row.map((v) => (v === '' ? null : { t: 's' as const, v }))),
  rowNumbers: rows.map((_, index) => index + 2),
});

const settings = (ctx: ImportContext, overrides: Partial<ImportSettings> = {}): ImportSettings => ({
  file: {},
  format: DEFAULT_IMPORT_FORMAT,
  columns: COLUMNS,
  defaults: { ...getInitialDefaults(ctx, null), 'opening.stichtag': '2025-12-31' },
  valueAssignments: {},
  loanTemplateId: null,
  ...overrides,
});

const run = (rows: string[][], ctx = context(), overrides: Partial<ImportSettings> = {}) =>
  validateImport(table(rows), settings(ctx, overrides), ctx);

const codes = (result: ReturnType<typeof run>, index = 0) =>
  result.rows[index]?.issues.map((issue) => issue.code) ?? [];

const ada = ['1', 'Ada', 'Lovelace', 'ada@example.org', '01.03.2020', '10.000,00', '1,5', '10.450,00', '10.000,00'];

describe('validateImport', () => {
  it('builds the Kreditgeber*in, the Kredit and the opening Zahlungen of a valid row', () => {
    const result = run([ada]);
    assert.deepEqual(codes(result), []);
    const [row] = result.rows;
    assert.equal(row?.lender?.lastName, 'Lovelace');
    assert.equal(row?.lender?.country, 'AT');
    assert.equal(row?.loan?.amount, 10_000);
    assert.equal(row?.loan?.interestRate, 1.5);
    assert.equal(row?.loan?.signDate, '2020-03-01');
    assert.equal(row?.loan?.terminationType, 'TERMINATION');
    assert.equal(row?.loan?.terminationPeriod, 6);
    assert.deepEqual(row?.opening, {
      stichtag: '2025-12-31',
      kontostand: 10_450,
      einlagenstand: 10_000,
      zinsuebertrag: 450,
    });
    assert.equal(result.summary.totals.zinsuebertrag, 450);
  });

  it('books the whole Kontostand as Einlagenstand when no Einlagenstand is given', () => {
    const result = run([[...ada.slice(0, 7), '9.000', '']]);
    assert.equal(result.rows[0]?.opening?.einlagenstand, 9_000);
    assert.equal(result.rows[0]?.opening?.zinsuebertrag, 0);
    // Without an Einlagenstand, a Kontostand above the Kreditbetrag cannot be booked as Einlagenstand.
    assert.ok(codes(run([[...ada.slice(0, 8), '']])).includes('einlagenstandAboveAmount'));
  });

  it('rejects an Einlagenstand above the Kontostand or the Kreditbetrag', () => {
    assert.ok(codes(run([[...ada.slice(0, 7), '9.000', '9.500']])).includes('einlagenstandAboveKontostand'));
    assert.ok(codes(run([[...ada.slice(0, 7), '12.000', '11.000']])).includes('einlagenstandAboveAmount'));
  });

  it('reports missing values, unknown choices and invalid numbers per column', () => {
    const ctx = context();
    const result = run([['', '', 'Lovelace', 'kaputt', '31.02.2020', 'viel', '1,5', '100', '']], ctx, {
      columns: { ...COLUMNS, 'lender.country': 0 },
      defaults: { ...settings(ctx).defaults },
    });
    const issues = result.rows[0]?.issues ?? [];
    const byColumn = Object.fromEntries(issues.map((issue) => [issue.column, issue.code]));
    assert.equal(byColumn['lender.firstName'], 'required');
    assert.equal(byColumn['lender.email'], 'invalidEmail');
    assert.equal(byColumn['loan.signDate'], 'invalidDate');
    assert.equal(byColumn['loan.amount'], 'invalidNumber');
    assert.equal(result.rows[0]?.loan, null);
    assert.ok(result.summary.errors >= 4);
  });

  it('collects unknown choice values until they are assigned', () => {
    const columns = { ...COLUMNS, 'lender.country': 9 };
    const row = [...ada, 'Absurdistan'];
    const unknown = run([row], context(), { columns });
    assert.deepEqual(unknown.unknownValues, { 'lender.country': ['Absurdistan'] });
    const assigned = run([row], context(), {
      columns,
      valueAssignments: { 'lender.country': { absurdistan: 'DE' } },
    });
    assert.deepEqual(assigned.unknownValues, {});
    assert.equal(assigned.rows[0]?.lender?.country, 'DE');
  });

  it('groups rows with the same Kreditgeber*innen-Nummer and rejects conflicting data', () => {
    const second = [...ada];
    second[4] = '01.06.2021';
    const grouped = run([ada, second]);
    assert.equal(grouped.summary.lenders, 1);
    assert.equal(grouped.summary.loans, 2);
    assert.deepEqual(codes(grouped, 1), []);

    const conflicting = [...second];
    conflicting[3] = 'other@example.org';
    const result = run([ada, conflicting]);
    assert.deepEqual(codes(result, 1), ['lenderDataDiffers']);
    assert.equal(result.rows[1]?.issues[0]?.column, 'lender.email');
  });

  it('assigns numbers after the highest existing one and rejects numbers already in use', () => {
    const ctx = context({ existingLenderNumbers: [1, 7], existingLoanNumbers: [3] });
    const withoutNumber = [...ada];
    withoutNumber[0] = '';
    const result = run([withoutNumber], ctx);
    assert.equal(result.rows[0]?.lender?.lenderNumber, 8);
    assert.equal(result.rows[0]?.loan?.loanNumber, 4);
    assert.ok(codes(run([ada], ctx)).includes('lenderNumberExists'));
  });

  it('warns about likely duplicates, unusual rates, a Kontostand of 0 and a mid-year Stichtag', () => {
    const ctx = context({ existingLenderEmails: ['ada@example.org'] });
    const row = [...ada.slice(0, 6), '12', '0', '0'];
    const result = run([row], ctx, { defaults: { ...settings(ctx).defaults, 'opening.stichtag': '2025-06-30' } });
    assert.deepEqual(codes(result).sort(), [
      'interestRateUnusual',
      'lenderExists',
      'noKontostand',
      'stichtagNotYearEnd',
    ]);
    assert.ok(result.rows[0]?.loan, 'warnings do not block the row');
  });

  it('accepts 31 Dec and 1 Jan as Stichtag without a warning', () => {
    for (const stichtag of ['2025-12-31', '2026-01-01']) {
      const ctx = context();
      const result = run([ada], ctx, { defaults: { ...settings(ctx).defaults, 'opening.stichtag': stichtag } });
      assert.deepEqual(codes(result), [], stichtag);
    }
  });

  it('requires an Anlageart for German Kreditgeber*innen when the compliance setting is on', () => {
    const ctx = context({ deInvestmentActCompliance: true, lenderCountry: 'DE', investmentTypeRates: [2] });
    assert.ok(codes(run([ada], ctx)).includes('noInvestmentType'));
    const matching = [...ada];
    matching[6] = '2';
    assert.equal(run([matching], ctx).rows[0]?.loan?.investmentTypeRate, 2);
  });

  it('warns once that the Zinsmethode locks when a project without history imports past Zahlungen', () => {
    const result = run([ada], context({ hasHistoricTransactions: false }));
    assert.deepEqual(
      result.issues.map((issue) => issue.code),
      ['interestMethodLocks'],
    );
  });

  it('stores additional fields the way the forms do and enforces required ones', () => {
    const fields: AdditionalFieldConfig[] = [
      {
        id: 'member',
        name: 'Mitglied',
        type: AdditionalFieldType.BOOLEAN,
        selectOptions: [],
        required: true,
        defaultValue: 'false',
      },
      {
        id: 'shares',
        name: 'Anteile',
        type: AdditionalFieldType.NUMBER,
        numberFormat: 'money' as never,
        selectOptions: [],
        required: true,
      },
    ];
    const ctx = context({ lenderAdditionalFields: fields });
    const missing = run([ada], ctx);
    assert.ok(
      missing.rows[0]?.issues.some((issue) => issue.column === 'lenderField.shares' && issue.code === 'required'),
    );
    const result = run([[...ada, 'ja', '1.500']], ctx, {
      columns: { ...COLUMNS, 'lenderField.member': 9, 'lenderField.shares': 10 },
    });
    assert.deepEqual(result.rows[0]?.lender?.additionalFields, { member: 'true', shares: '1.500,00' });
  });
});
