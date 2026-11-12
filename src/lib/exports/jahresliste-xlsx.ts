import ExcelJS from 'exceljs';

import { type Jahresliste, JAHRESLISTE_VORGANG_LABELS } from './jahresliste';

// OOXML formats use US syntax; Excel shows them in the reader's locale.
const CURRENCY = '#,##0.00\\ "€"';
const DATE = 'dd.mm.yyyy';
const PERCENT = '#,##0.00" %"';

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/** Writes the Jahresliste as an .xlsx workbook with the sheets Summen and Jahresliste. */
export async function jahreslisteXlsx(jahresliste: Jahresliste): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sums = workbook.addWorksheet('Summen');
  sums.columns = [
    { header: 'Vorgang', key: 'vorgang', width: 28 },
    { header: 'Summe', key: 'amount', width: 18, style: { numFmt: CURRENCY } },
  ];
  for (const sum of jahresliste.sums) {
    sums.addRow({ vorgang: JAHRESLISTE_VORGANG_LABELS[sum.vorgang], amount: sum.amount });
  }
  styleHeader(sums);

  const list = workbook.addWorksheet('Jahresliste');
  list.columns = [
    { header: 'Kreditgeber*in-Nr.', key: 'lenderNumber', width: 18 },
    { header: 'Nachname', key: 'lastName', width: 24 },
    { header: 'Vorname', key: 'firstName', width: 18 },
    { header: 'Kredit-Nr.', key: 'loanNumber', width: 12 },
    { header: 'Vorgang', key: 'vorgang', width: 26 },
    { header: 'Datum', key: 'date', width: 12, style: { numFmt: DATE } },
    { header: 'Betrag', key: 'amount', width: 16, style: { numFmt: CURRENCY } },
    { header: 'Zinssatz', key: 'interestRate', width: 10, style: { numFmt: PERCENT } },
    { header: 'Zinsbetrag', key: 'interestAmount', width: 16, style: { numFmt: CURRENCY } },
  ];
  for (const row of jahresliste.rows) {
    list.addRow({ ...row, vorgang: JAHRESLISTE_VORGANG_LABELS[row.vorgang], interestAmount: row.interestAmount ?? '' });
  }
  styleHeader(list);
  list.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: list.columnCount } };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
