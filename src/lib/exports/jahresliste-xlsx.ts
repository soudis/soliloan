import ExcelJS from 'exceljs';

import { type Jahresliste, JAHRESLISTE_VORGANG_LABELS } from './jahresliste';

// OOXML formats use US syntax; Excel shows them in the reader's locale.
const CURRENCY = '#,##0.00\\ "€"';
const DATE = 'dd.mm.yyyy';
const PERCENT = '#,##0.00" %"';

type SheetColumn = { name: string; width: number; numFmt?: string };

/** An Excel table starting at A1, so the header and filters belong to the table. */
function addSheetTable(sheet: ExcelJS.Worksheet, name: string, columns: SheetColumn[], rows: ExcelJS.CellValue[][]) {
  sheet.columns = columns.map((column) => ({
    width: column.width,
    ...(column.numFmt ? { style: { numFmt: column.numFmt } } : {}),
  }));
  sheet.addTable({
    name,
    ref: 'A1',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: columns.map((column) => ({ name: column.name, filterButton: true })),
    rows,
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/** Writes the Jahresliste as an .xlsx workbook with the sheets Summen and Jahresliste. */
export async function jahreslisteXlsx(jahresliste: Jahresliste): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  addSheetTable(
    workbook.addWorksheet('Summen'),
    'Summen',
    SUM_COLUMNS,
    jahresliste.sums.map((sum) => [JAHRESLISTE_VORGANG_LABELS[sum.vorgang], sum.amount]),
  );
  addSheetTable(
    workbook.addWorksheet('Jahresliste'),
    'Jahresliste',
    LIST_COLUMNS,
    jahresliste.rows.map((row) => [
      row.lenderNumber,
      row.lastName,
      row.firstName,
      row.loanNumber,
      JAHRESLISTE_VORGANG_LABELS[row.vorgang],
      row.date,
      row.amount,
      row.interestRate,
      row.interestAmount ?? 0,
    ]),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const SUM_COLUMNS: SheetColumn[] = [
  { name: 'Vorgang', width: 28 },
  { name: 'Summe', width: 18, numFmt: CURRENCY },
];

const LIST_COLUMNS: SheetColumn[] = [
  { name: 'Kreditgeber*in-Nr.', width: 18 },
  { name: 'Nachname', width: 24 },
  { name: 'Vorname', width: 18 },
  { name: 'Kredit-Nr.', width: 12 },
  { name: 'Vorgang', width: 26 },
  { name: 'Datum', width: 12, numFmt: DATE },
  { name: 'Betrag', width: 16, numFmt: CURRENCY },
  { name: 'Zinssatz', width: 10, numFmt: PERCENT },
  { name: 'Zinsbetrag', width: 16, numFmt: CURRENCY },
];
