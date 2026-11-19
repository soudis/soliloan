import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import AdmZip from 'adm-zip';
import ExcelJS from 'exceljs';

import { DEPOSIT, fixtureLoan, TERMINATION, tx } from '@/test/loan-fixture';
import { buildJahresliste } from './jahresliste';
import { jahreslisteXlsx } from './jahresliste-xlsx';
import { kontomitteilungenZip } from './kontomitteilungen-zip';

const loans = [
  fixtureLoan({
    interestRate: 2,
    interestMethod: 'ACT_365_NOCOMPOUND',
    lender: { id: 'mail', lenderNumber: 7, notificationType: 'EMAIL', lastName: 'Mail' },
    transactions: [tx(DEPOSIT, new Date(2024, 0, 10), 5000)],
  }),
  fixtureLoan({
    interestRate: 2,
    interestMethod: 'ACT_365_NOCOMPOUND',
    lender: { id: 'mail', lenderNumber: 7, notificationType: 'EMAIL', lastName: 'Mail' },
    transactions: [tx(DEPOSIT, new Date(2025, 4, 10), 1000)],
  }),
  fixtureLoan({
    interestRate: 1,
    interestMethod: 'ACT_365_NOCOMPOUND',
    lender: { id: 'letter', lenderNumber: 12, notificationType: 'POST', lastName: 'Letter' },
    transactions: [tx(DEPOSIT, new Date(2023, 0, 1), 1000), tx(TERMINATION, new Date(2025, 2, 1), -1030.43)],
  }),
  fixtureLoan({
    interestRate: 1,
    interestMethod: 'ACT_365_NOCOMPOUND',
    lender: { id: 'portal', lenderNumber: 3, notificationType: 'ONLINE', lastName: 'Portal' },
    transactions: [tx(DEPOSIT, new Date(2025, 11, 1), 1000)],
  }),
  // closed before 2025: no Kontomitteilung
  fixtureLoan({
    interestRate: 1,
    interestMethod: 'ACT_365_NOCOMPOUND',
    lender: { id: 'gone', lenderNumber: 1, notificationType: 'EMAIL', lastName: 'Gone' },
    transactions: [tx(DEPOSIT, new Date(2020, 0, 1), 1000), tx(TERMINATION, new Date(2023, 0, 1), -1030.3)],
  }),
];

describe('kontomitteilungenZip', () => {
  it('holds exactly the Kreditgeber*innen of the Jahresliste, in their Benachrichtigungsart folder', async () => {
    const jahresliste = buildJahresliste(loans, 2025);
    const zip = await kontomitteilungenZip(jahresliste.lenders, async (lender) => ({
      fileName: `Kontomitteilung ${lender.id}.pdf`,
      pdf: new TextEncoder().encode(lender.id),
    }));

    const entries = new AdmZip(zip).getEntries().map((entry) => entry.entryName);
    assert.deepEqual(entries.sort(), [
      'email/7_Kontomitteilung mail.pdf',
      'online/3_Kontomitteilung portal.pdf',
      'post/12_Kontomitteilung letter.pdf',
    ]);
    assert.deepEqual(
      [...new Set(jahresliste.rows.map((row) => row.lenderId))].sort(),
      jahresliste.lenders.map((lender) => lender.id).sort(),
    );
  });
});

describe('jahreslisteXlsx', () => {
  it('writes Summen and Jahresliste as Excel tables', async () => {
    const jahresliste = buildJahresliste(loans, 2025);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await jahreslisteXlsx(jahresliste)) as unknown as ArrayBuffer);

    const sums = workbook.getWorksheet('Summen');
    const list = workbook.getWorksheet('Jahresliste');
    assert.ok(sums && list);
    assert.deepEqual(sums.getColumn(1).values.slice(1), [
      'Vorgang',
      'Kontostand Jahresbeginn',
      'Einzahlung',
      'Zinsertrag',
      'Zinsauszahlung',
      'Teilrückzahlung',
      'Rückzahlung',
      'Teilerlassung',
      'Erlassung',
      'Kontostand Jahresende',
    ]);
    assert.deepEqual((list.getRow(1).values as unknown[]).slice(1), [
      'Kreditgeber*in-Nr.',
      'Name',
      'Typ',
      'Kredit-Nr.',
      'Vorgang',
      'Datum',
      'Betrag',
      'Zinssatz',
      'Zinsbetrag',
    ]);
    assert.equal(list.rowCount, jahresliste.rows.length + 1);
    assert.equal(list.views[0]?.state, 'frozen');
    assert.equal(sums.views[0]?.state, 'frozen');
    assert.equal(list.autoFilter, undefined);
    assert.equal(sums.autoFilter, undefined);
    assertTable(list, 'Jahresliste', jahresliste.rows.length);
    assertTable(sums, 'Summen', jahresliste.sums.length);
    assert.match(sums.getRow(2).getCell(2).numFmt ?? '', /€/);

    const first = list.getRow(2);
    assert.equal(first.getCell(2).value, jahresliste.rows[0].name);
    assert.equal(first.getCell(3).value, 'Person');
    assert.equal(first.getCell(5).value, 'Kontostand Jahresbeginn');
    assert.equal((first.getCell(6).value as Date).toISOString(), '2025-01-01T00:00:00.000Z');
    assert.equal(first.getCell(6).numFmt, 'mm-dd-yy');
    assert.match(first.getCell(7).numFmt ?? '', /€/);
    assert.equal(first.getCell(8).numFmt, '0.00%');
    assert.equal(first.getCell(8).value, jahresliste.rows[0].interestRate / 100);
    assert.equal(jahresliste.rows[0].interestAmount, null);
    assert.equal(first.getCell(9).value, 0);
    const withInterest = jahresliste.rows.findIndex((row) => row.interestAmount !== null);
    assert.ok(withInterest >= 0);
    assert.equal(list.getRow(withInterest + 2).getCell(9).value, jahresliste.rows[withInterest].interestAmount);
  });
});

function assertTable(sheet: ExcelJS.Worksheet, name: string, dataRows: number) {
  const table = sheet.getTable(name);
  assert.equal(table.name, name);
  assert.equal(table.headerRow, true);
  assert.equal(table.showRowStripes, true);
  const headers = (sheet.getRow(1).values as unknown[]).slice(1);
  const lastColumn = String.fromCharCode('A'.charCodeAt(0) + headers.length - 1);
  // ExcelJS keeps the full range on the table model; `ref` is only the anchor used when writing.
  const tableRef = (table as unknown as { model: { tableRef: string } }).model.tableRef;
  assert.equal(tableRef, `A1:${lastColumn}${dataRows + 1}`);
  assert.deepEqual(
    headers.map((_, index) => table.getColumn(index).name),
    headers,
  );
  for (const [index] of headers.entries()) {
    assert.equal(table.getColumn(index).filterButton, true);
  }
}
