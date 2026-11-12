import {
  IMPORT_DELIMITERS,
  type ImportCell,
  type ImportDelimiter,
  type ImportEncoding,
  type ImportFileOptions,
  type ParsedImportFile,
} from './types';

/** Decodes bytes as UTF-8 when they are valid UTF-8, otherwise as Windows-1252 (Excel's default on Windows). */
export function decodeCsv(
  bytes: Uint8Array,
  encoding?: ImportEncoding | null,
): { text: string; encoding: ImportEncoding } {
  const strip = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  if (encoding) return { text: strip(new TextDecoder(encoding).decode(bytes)), encoding };
  try {
    return { text: strip(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' };
  }
}

/** Splits CSV text into records (RFC 4180: quoted fields may contain delimiters, quotes and line breaks). */
export function splitCsv(text: string, delimiter: ImportDelimiter): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/**
 * Picks the delimiter that splits the first lines into the same number of fields, more than one, most often.
 * Ties go to `;`, the delimiter of German Excel.
 */
export function detectDelimiter(text: string): ImportDelimiter {
  const sample = text.split(/\r?\n/).slice(0, 20).join('\n');
  let best: { delimiter: ImportDelimiter; score: number } = { delimiter: ';', score: -1 };
  for (const delimiter of IMPORT_DELIMITERS) {
    const counts = splitCsv(sample, delimiter)
      .filter((record) => record.some((field) => field.trim() !== ''))
      .map((record) => record.length);
    if (counts.length === 0 || (counts[0] ?? 0) < 2) continue;
    const consistent = counts.filter((count) => count === counts[0]).length;
    const score = consistent * (counts[0] ?? 0);
    if (score > best.score) best = { delimiter, score };
  }
  return best.delimiter;
}

/** Parses a CSV file. The first non-empty line is the header; empty lines are skipped. */
export function parseCsv(bytes: Uint8Array, options: ImportFileOptions = {}): ParsedImportFile {
  const { text, encoding } = decodeCsv(bytes, options.encoding);
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const records = splitCsv(text, delimiter);
  const headers: string[] = [];
  const rows: ImportCell[][] = [];
  const rowNumbers: number[] = [];
  let headerFound = false;
  records.forEach((record, index) => {
    if (!record.some((field) => field.trim() !== '')) return;
    if (!headerFound) {
      headers.push(...record.map((field) => field.trim()));
      headerFound = true;
      return;
    }
    rows.push(record.map((field) => (field.trim() === '' ? null : { t: 's', v: field })));
    rowNumbers.push(index + 1);
  });
  return {
    kind: 'csv',
    sheets: [],
    options: { sheet: null, delimiter, encoding },
    table: { headers, rows, rowNumbers },
  };
}
