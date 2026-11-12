import 'server-only';

import ExcelJS from 'exceljs';

import { parseCsv } from './csv';
import type { ImportCell, ImportFileKind, ImportFileOptions, ParsedImportFile } from './types';
import { toIsoDate } from './values';

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** The file kind by extension; `null` for formats the Import does not read (.xls, .ods and anything else). */
export function importFileKind(fileName: string): ImportFileKind | null {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'csv' || extension === 'txt') return 'csv';
  if (extension === 'xlsx') return 'xlsx';
  return null;
}

/** Excel stores dates as UTC midnight; a few milliseconds of float error are rounded away. */
const excelDate = (date: Date) => {
  const rounded = new Date(Math.round(date.getTime() / 60_000) * 60_000);
  return toIsoDate(rounded.getUTCFullYear(), rounded.getUTCMonth() + 1, rounded.getUTCDate());
};

function toCell(cell: ExcelJS.Cell): ImportCell {
  let value: ExcelJS.CellValue = cell.value;
  if (value && typeof value === 'object' && 'result' in value) value = (value.result ?? null) as ExcelJS.CellValue;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return { t: 'd', v: excelDate(value) };
  if (typeof value === 'number') return { t: 'n', v: value, ...(cell.numFmt?.includes('%') ? { percent: true } : {}) };
  if (typeof value === 'boolean') return { t: 'b', v: value };
  if (typeof value === 'string') return value.trim() === '' ? null : { t: 's', v: value };
  if (typeof value === 'object') {
    if ('richText' in value) return { t: 's', v: value.richText.map((part) => part.text).join('') };
    if ('text' in value && typeof value.text === 'string') return { t: 's', v: value.text };
    if ('error' in value) return null;
  }
  return { t: 's', v: String(value) };
}

/** Reads one worksheet of an .xlsx file: the first non-empty row is the header, empty rows are skipped. */
export async function parseXlsx(bytes: Uint8Array, options: ImportFileOptions = {}): Promise<ParsedImportFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  const sheets = workbook.worksheets.map((sheet) => sheet.name);
  const worksheet = workbook.worksheets.find((sheet) => sheet.name === options.sheet) ?? workbook.worksheets[0];
  if (!worksheet) throw new Error('error.import.emptyFile');

  const headers: string[] = [];
  const rows: ImportCell[][] = [];
  const rowNumbers: number[] = [];
  const width = worksheet.columnCount;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells = Array.from({ length: width }, (_, index) => toCell(row.getCell(index + 1)));
    if (cells.every((cell) => cell === null)) return;
    if (headers.length === 0) {
      headers.push(...cells.map((cell) => (cell ? String(cell.v).trim() : '')));
      return;
    }
    rows.push(cells);
    rowNumbers.push(rowNumber);
  });
  while (headers.length > 0 && headers.at(-1) === '' && rows.every((row) => row[headers.length - 1] == null)) {
    headers.pop();
  }
  return {
    kind: 'xlsx',
    sheets,
    options: { sheet: worksheet.name, delimiter: null, encoding: null },
    table: { headers, rows: rows.map((row) => row.slice(0, headers.length)), rowNumbers },
  };
}

/** Reads an import file. Throws `error.import.*` messages for files the Import cannot read. */
export async function parseImportFile(
  fileName: string,
  bytes: Uint8Array,
  options: ImportFileOptions = {},
): Promise<ParsedImportFile> {
  if (bytes.byteLength > MAX_IMPORT_FILE_BYTES) throw new Error('error.import.fileTooLarge');
  const kind = importFileKind(fileName);
  if (!kind) throw new Error('error.import.unsupportedFile');
  try {
    const parsed = kind === 'csv' ? parseCsv(bytes, options) : await parseXlsx(bytes, options);
    if (parsed.table.headers.length === 0) throw new Error('error.import.emptyFile');
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('error.')) throw error;
    console.error('import file could not be read', error);
    throw new Error('error.import.unreadableFile');
  }
}
