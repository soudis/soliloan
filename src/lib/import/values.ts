import { normalizeKey } from './system-columns';
import type { DateOrder, DecimalSeparator, ImportCell, ImportFormat } from './types';

/** The text of a cell as the user sees it, trimmed; empty cells give ''. */
export function cellText(cell: ImportCell | undefined): string {
  if (!cell) return '';
  switch (cell.t) {
    case 's':
      return cell.v.trim();
    case 'n':
      return String(cell.percent ? round(cell.v * 100, 10) : cell.v);
    case 'd':
      return cell.v;
    case 'b':
      return cell.v ? 'true' : 'false';
  }
}

export const isEmptyCell = (cell: ImportCell | undefined) => cellText(cell) === '';

export const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const NUMBER_NOISE = /[\s  €$£]|EUR|CHF/gi;

/**
 * Parses a number. Text uses the given decimal separator; the other separator and apostrophes are taken as
 * thousands separators. A `%` sign is dropped, the number stays as written ("1,5 %" is 1.5).
 */
export function parseNumber(cell: ImportCell | undefined, decimalSeparator: DecimalSeparator): number | null {
  if (!cell) return null;
  if (cell.t === 'n') return cell.v;
  if (cell.t !== 's') return null;
  let text = cell.v.replace(NUMBER_NOISE, '').replace('%', '');
  if (text === '') return null;
  const negative = /^\(.*\)$/.test(text) || text.startsWith('-') || text.endsWith('-');
  text = text.replace(/^\(|\)$/g, '').replace(/^-|-$/g, '');
  const thousands = decimalSeparator === ',' ? /[.']/g : /[,']/g;
  text = text.replace(thousands, '');
  if (decimalSeparator === ',') text = text.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return negative ? -value : value;
}

/**
 * Parses a percentage. Plain numbers are percent ("1,5" and 1.5 are 1.5 %); Excel cells formatted as percent hold
 * the fraction and are multiplied by 100.
 */
export function parsePercent(cell: ImportCell | undefined, decimalSeparator: DecimalSeparator): number | null {
  if (cell?.t === 'n' && cell.percent) return round(cell.v * 100, 6);
  return parseNumber(cell, decimalSeparator);
}

const pad = (value: number) => String(value).padStart(2, '0');

export const toIsoDate = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

const validDate = (year: number, month: number, day: number) => {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const fullYear = (year: number) => (year >= 100 ? year : year < 70 ? 2000 + year : 1900 + year);

/** Parses a date to `yyyy-mm-dd`. Text accepts `.`, `/` and `-` separators in the given order, ISO always. */
export function parseDate(cell: ImportCell | undefined, dateOrder: DateOrder): string | null {
  if (!cell) return null;
  if (cell.t === 'd') return cell.v;
  if (cell.t !== 's') return null;
  const text = cell.v.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return validDate(year, month, day) ? toIsoDate(year, month, day) : null;
  }
  const parts = /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:\s.*)?$/.exec(text);
  if (!parts) return null;
  const [a, b, c] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const [year, month, day] =
    dateOrder === 'YMD' ? [a, b, c] : dateOrder === 'MDY' ? [fullYear(c), a, b] : [fullYear(c), b, a];
  return validDate(year, month, day) ? toIsoDate(year, month, day) : null;
}

/** Normalised form of a file value for matching choice options and value assignments. */
export const valueKey = (text: string) => normalizeKey(text);

/** Finds the canonical option a file value stands for, or null. Codes and labels compare normalised. */
export function matchOption(text: string, options: Record<string, string[]>): string | null {
  const key = valueKey(text);
  if (key === '') return null;
  for (const [value, labels] of Object.entries(options)) {
    if (labels.some((label) => valueKey(label) === key)) return value;
  }
  return null;
}

/**
 * Guesses the decimal separator from text cells: a separator followed by one or two digits at the end is decimal,
 * one followed by exactly three digits and then the other separator is a thousands separator.
 */
export function detectDecimalSeparator(cells: ImportCell[]): DecimalSeparator | null {
  let comma = 0;
  let point = 0;
  for (const cell of cells) {
    if (cell?.t !== 's') continue;
    const text = cell.v.replace(NUMBER_NOISE, '').replace('%', '');
    if (/\d,\d{1,2}$/.test(text) || /\d\.\d{3},\d/.test(text)) comma++;
    else if (/\d\.\d{1,2}$/.test(text) || /\d,\d{3}\.\d/.test(text)) point++;
  }
  if (comma === 0 && point === 0) return null;
  return comma >= point ? ',' : '.';
}

/** Guesses the date order from text cells. Day-first is assumed unless a cell only makes sense month-first. */
export function detectDateOrder(cells: ImportCell[]): DateOrder | null {
  let ymd = 0;
  let separated = 0;
  let monthFirst = 0;
  for (const cell of cells) {
    if (cell?.t !== 's') continue;
    const text = cell.v.trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(text)) {
      ymd++;
      continue;
    }
    const parts = /^(\d{1,2})[./-](\d{1,2})[./-]\d{2,4}/.exec(text);
    if (!parts) continue;
    separated++;
    if (Number(parts[2]) > 12) monthFirst++;
  }
  if (ymd === 0 && separated === 0) return null;
  if (ymd > separated) return 'YMD';
  return monthFirst > 0 ? 'MDY' : 'DMY';
}

export const DEFAULT_IMPORT_FORMAT: ImportFormat = { decimalSeparator: ',', dateOrder: 'DMY' };
