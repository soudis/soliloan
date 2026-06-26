import type { Column, Row, Table } from '@tanstack/react-table';
import type { Worksheet } from 'exceljs';

import type { ColumnExportType, DataTableColumnFilters } from '@/components/ui/data-table';
import { NumberParser } from '@/lib/utils';

export type ExportColumnScope = 'visible' | 'all';

/**
 * Excel/OOXML number formats use US syntax (comma = thousands, period = decimal).
 * Excel applies the user's locale when displaying the file.
 */
const EXCEL_NUM_FMT: Record<Exclude<ColumnExportType, 'text'>, string> = {
  currency: '#,##0.00\\ "€"',
  integer: '#,##0',
  number: '#,##0.##',
  date: 'dd.mm.yyyy',
  percent: '#,##0.00"%"',
  duration: '#,##0',
};

const MIN_COLUMN_WIDTH = 12;
const MAX_COLUMN_WIDTH = 52;

const numberParser = new NumberParser('de-DE');

function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isUiColumn(column: Column<unknown>): boolean {
  const meta = column.columnDef.meta;
  if (meta?.actionsColumn || meta?.bulkSelectColumn) return true;
  return column.id === 'select' || column.id === 'actions';
}

export function getExportableColumns<T>(table: Table<T>, scope: ExportColumnScope): Column<T, unknown>[] {
  return table
    .getAllColumns()
    .filter((column) => !isUiColumn(column as Column<unknown>))
    .filter((column) => scope === 'all' || column.getIsVisible());
}

export function getExportableRows<T>(table: Table<T>): Row<T>[] {
  const selectedRows = table.getSelectedRowModel().rows;
  if (selectedRows.length > 0) {
    return selectedRows;
  }
  return table.getFilteredRowModel().rows;
}

function resolveColumnLabel<T>(column: Column<T, unknown>, columnFilters: DataTableColumnFilters): string {
  const exportLabel = column.columnDef.meta?.export?.label;
  if (exportLabel) return exportLabel;
  const filterLabel = columnFilters[column.id]?.label;
  if (filterLabel) return filterLabel;
  return column.id;
}

type ResolvedCell = {
  value: string | number | Date | null | undefined;
  type: ColumnExportType;
  wrapText: boolean;
};

function resolveCellValue<T>(row: Row<T>, column: Column<T, unknown>): ResolvedCell {
  const exportMeta = column.columnDef.meta?.export;
  const exportType = exportMeta?.type ?? 'text';
  const wrapText = exportMeta?.wrapText ?? false;
  const columnDef = column.columnDef;

  let raw: unknown;
  if (exportMeta?.getValue) {
    raw = exportMeta.getValue(row.original);
  } else if ('accessorFn' in columnDef && typeof columnDef.accessorFn === 'function') {
    raw = columnDef.accessorFn(row.original, row.index);
  } else {
    raw = row.getValue(column.id);
  }

  if (raw === null || raw === undefined || raw === '') {
    return { value: undefined, type: exportType, wrapText };
  }

  switch (exportType) {
    case 'currency': {
      const num = typeof raw === 'number' ? raw : numberParser.parse(String(raw));
      if (num === null || Number.isNaN(num)) return { value: undefined, type: exportType, wrapText };
      return { value: roundToDecimals(num, 2), type: exportType, wrapText };
    }
    case 'percent': {
      const num = typeof raw === 'number' ? raw : numberParser.parse(String(raw));
      if (num === null || Number.isNaN(num)) return { value: undefined, type: exportType, wrapText };
      return { value: roundToDecimals(num, 2), type: exportType, wrapText };
    }
    case 'integer':
    case 'duration': {
      const num = typeof raw === 'number' ? raw : numberParser.parse(String(raw));
      if (num === null || Number.isNaN(num)) return { value: undefined, type: exportType, wrapText };
      return { value: Math.trunc(num), type: exportType, wrapText };
    }
    case 'number': {
      const num = typeof raw === 'number' ? raw : numberParser.parse(String(raw));
      if (num === null || Number.isNaN(num)) return { value: undefined, type: exportType, wrapText };
      return { value: num, type: exportType, wrapText };
    }
    case 'date': {
      if (raw instanceof Date) {
        return Number.isNaN(raw.getTime())
          ? { value: undefined, type: 'date', wrapText }
          : { value: raw, type: 'date', wrapText };
      }
      const date = new Date(String(raw));
      if (Number.isNaN(date.getTime())) return { value: undefined, type: 'date', wrapText };
      return { value: date, type: 'date', wrapText };
    }
    default:
      return { value: String(raw), type: 'text', wrapText };
  }
}

export function buildExportFilename(exportPrefix?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = exportPrefix?.trim() || 'export';
  return `${base}-${date}.xlsx`;
}

function applyCellFormat(type: ColumnExportType, value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) return;
  if (type === 'text') return;
  return { numFmt: EXCEL_NUM_FMT[type] };
}

function getCellTextLength(value: unknown): number {
  if (value == null) return 0;

  const text =
    value instanceof Date
      ? value.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : String(value);

  const lines = text.split('\n');
  return Math.max(0, ...lines.map((line) => line.length));
}

function autoFitWorksheetColumns(worksheet: Worksheet) {
  worksheet.columns.forEach((column) => {
    if (!column?.eachCell) return;

    let maxLength = MIN_COLUMN_WIDTH;
    column.eachCell({ includeEmpty: false }, (cell) => {
      maxLength = Math.max(maxLength, getCellTextLength(cell.value));
    });

    column.width = Math.min(MAX_COLUMN_WIDTH, maxLength + 2);
  });
}

export async function exportTableToExcel<T>({
  table,
  columnScope,
  columnFilters = {},
  exportPrefix,
}: {
  table: Table<T>;
  columnScope: ExportColumnScope;
  columnFilters?: DataTableColumnFilters;
  exportPrefix?: string;
}): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export');

  const columns = getExportableColumns(table, columnScope);
  const rows = getExportableRows(table);

  worksheet.addRow(columns.map((column) => resolveColumnLabel(column, columnFilters)));

  for (const row of rows) {
    const resolvedCells = columns.map((column) => resolveCellValue(row, column));
    const excelRow = worksheet.addRow(resolvedCells.map((cell) => cell.value ?? null));

    resolvedCells.forEach((cell, index) => {
      const excelCell = excelRow.getCell(index + 1);
      const format = applyCellFormat(cell.type, cell.value);
      if (format) {
        excelCell.numFmt = format.numFmt;
      }
      if (cell.wrapText) {
        excelCell.alignment = { wrapText: true, vertical: 'top' };
      }
    });

    if (resolvedCells.some((cell) => cell.wrapText && typeof cell.value === 'string' && cell.value.includes('\n'))) {
      const lineCount = Math.max(
        ...resolvedCells.map((cell) => (typeof cell.value === 'string' ? cell.value.split('\n').length : 1)),
      );
      excelRow.height = Math.max(15, lineCount * 15);
    }
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  autoFitWorksheetColumns(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildExportFilename(exportPrefix);
  link.click();
  URL.revokeObjectURL(url);
}
