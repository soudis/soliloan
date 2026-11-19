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

/** A CSV record and the line it starts on (1-based), which differs from its index once a field spans lines. */
type CsvRecord = { fields: string[]; line: number };

/** Splits CSV text into records (RFC 4180: quoted fields may contain delimiters, quotes and line breaks). */
function splitCsvRecords(text: string, delimiter: ImportDelimiter): CsvRecord[] {
  const records: CsvRecord[] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const lineBreak = char === '\n' || char === '\r';
    if (lineBreak && char === '\r' && text[i + 1] === '\n') i++;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += lineBreak ? '\n' : char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      record.push(field);
      field = '';
    } else if (lineBreak) {
      record.push(field);
      records.push({ fields: record, line: recordLine });
      record = [];
      field = '';
      recordLine = line + 1;
    } else {
      field += char;
    }
    if (lineBreak) line++;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push({ fields: record, line: recordLine });
  }
  return records;
}

/** Splits CSV text into records (RFC 4180: quoted fields may contain delimiters, quotes and line breaks). */
export function splitCsv(text: string, delimiter: ImportDelimiter): string[][] {
  return splitCsvRecords(text, delimiter).map((record) => record.fields);
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
  const records = splitCsvRecords(text, delimiter);
  const headers: string[] = [];
  const rows: ImportCell[][] = [];
  const rowNumbers: number[] = [];
  let headerFound = false;
  for (const { fields, line } of records) {
    if (!fields.some((field) => field.trim() !== '')) continue;
    if (!headerFound) {
      headers.push(...fields.map((field) => field.trim()));
      headerFound = true;
      continue;
    }
    rows.push(fields.map((field) => (field.trim() === '' ? null : { t: 's', v: field })));
    rowNumbers.push(line);
  }
  return {
    kind: 'csv',
    sheets: [],
    options: { sheet: null, delimiter, encoding },
    table: { headers, rows, rowNumbers },
  };
}
