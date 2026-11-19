import ExcelJS from 'exceljs';

import { JAHRESLISTE_LENDER_TYPE_LABELS, JAHRESLISTE_VORGANG_LABELS, type Jahresliste } from './jahresliste';

// Built-in Excel formats (ids 14 and 10). A custom code is filed under Custom.
// The date follows the reader's locale; the percent format multiplies by 100.
const CURRENCY = '#,##0.00\\ "€"';
const DATE = 'mm-dd-yy';
const PERCENT = '0.00%';

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
      row.name,
      JAHRESLISTE_LENDER_TYPE_LABELS[row.lenderType],
      row.loanNumber,
      JAHRESLISTE_VORGANG_LABELS[row.vorgang],
      row.date,
      row.amount,
      row.interestRate / 100,
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
  { name: 'Name', width: 28 },
  { name: 'Typ', width: 16 },
  { name: 'Kredit-Nr.', width: 12 },
  { name: 'Vorgang', width: 26 },
  { name: 'Datum', width: 12, numFmt: DATE },
  { name: 'Betrag', width: 16, numFmt: CURRENCY },
  { name: 'Zinssatz', width: 10, numFmt: PERCENT },
  { name: 'Zinsbetrag', width: 16, numFmt: CURRENCY },
];
