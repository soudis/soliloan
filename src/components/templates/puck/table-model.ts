export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type TableCellStyle = {
  fontSize?: number;
  color?: string;
  textAlign?: TextAlign;
};

export const DEFAULT_HEADER_FONT_SIZE = 13;
export const DEFAULT_BODY_FONT_SIZE = 14;
export const DEFAULT_TEXT_COLOR = '#000000';

export function resizeArray(arr: string[], newLength: number, defaultValue: string): string[] {
  if (arr.length === newLength) return arr;
  if (arr.length > newLength) return arr.slice(0, newLength);
  return [...arr, ...Array(newLength - arr.length).fill(defaultValue)];
}

export function resize2DArray(arr: string[][], newRows: number, newCols: number, defaultValue: string): string[][] {
  if (arr.length === newRows && arr.every((row) => row.length === newCols)) {
    return arr;
  }
  const resized: string[][] = [];
  for (let row = 0; row < newRows; row += 1) {
    resized.push(resizeArray(arr[row] || [], newCols, defaultValue));
  }
  return resized;
}

export function getDefaultCellStyle(isHeader: boolean, fallbackAlign: TextAlign): Required<TableCellStyle> {
  return {
    fontSize: isHeader ? DEFAULT_HEADER_FONT_SIZE : DEFAULT_BODY_FONT_SIZE,
    color: DEFAULT_TEXT_COLOR,
    textAlign: fallbackAlign,
  };
}

export function resolveCellStyle(
  style: TableCellStyle | undefined,
  isHeader: boolean,
  fallbackAlign: TextAlign,
): Required<TableCellStyle> {
  const defaults = getDefaultCellStyle(isHeader, fallbackAlign);
  return {
    fontSize: style?.fontSize ?? defaults.fontSize,
    color: style?.color ?? defaults.color,
    textAlign: style?.textAlign ?? defaults.textAlign,
  };
}

function resizeStyleArray(
  arr: TableCellStyle[],
  newLength: number,
  isHeader: boolean,
  fallbackAlign: TextAlign,
): TableCellStyle[] {
  if (arr.length === newLength) return arr;
  if (arr.length > newLength) return arr.slice(0, newLength);
  return [
    ...arr,
    ...Array.from({ length: newLength - arr.length }, () => getDefaultCellStyle(isHeader, fallbackAlign)),
  ];
}

export function resize2DStyleArray(
  arr: TableCellStyle[][],
  newRows: number,
  newCols: number,
  fallbackAlign: TextAlign,
): TableCellStyle[][] {
  if (arr.length === newRows && arr.every((row) => row.length === newCols)) {
    return arr;
  }
  const resized: TableCellStyle[][] = [];
  for (let row = 0; row < newRows; row += 1) {
    resized.push(resizeStyleArray(arr[row] || [], newCols, false, fallbackAlign));
  }
  return resized;
}

export function resizeColumnWidths(widths: number[], newLength: number, defaultWidth: number): number[] {
  if (widths.length === newLength) return widths;
  if (widths.length > newLength) return widths.slice(0, newLength);
  return [...widths, ...Array(newLength - widths.length).fill(defaultWidth)];
}

export function normalizeColumnWidths(widths: number[] | undefined, columns: number): number[] {
  if (columns <= 0) return [];
  const raw = Array.from({ length: columns }, (_, index) => {
    const value = Number(widths?.[index]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = raw.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Array.from({ length: columns }, () => 100 / columns);
  }
  return raw.map((value) => (value / total) * 100);
}

export function resizeTableArrays<
  T extends {
    columns: number;
    rows: number;
    headerTexts: string[];
    cellTexts: string[][];
    headerStyles: TableCellStyle[];
    cellStyles: TableCellStyle[][];
    columnWidths: number[];
    textAlign: TextAlign;
  },
>(props: T): T {
  const columns = Math.max(1, props.columns);
  const rows = Math.max(1, props.rows);
  const headerTexts = resizeArray(props.headerTexts ?? [], columns, 'Spalte');
  const cellTexts = resize2DArray(props.cellTexts ?? [], rows, columns, '');
  const headerStyles = resizeStyleArray(props.headerStyles ?? [], columns, true, props.textAlign);
  const cellStyles = resize2DStyleArray(props.cellStyles ?? [], rows, columns, props.textAlign);
  const columnWidths = resizeColumnWidths(props.columnWidths ?? [], columns, 100 / columns);

  if (
    columns === props.columns &&
    rows === props.rows &&
    headerTexts === props.headerTexts &&
    cellTexts === props.cellTexts &&
    headerStyles === props.headerStyles &&
    cellStyles === props.cellStyles &&
    columnWidths === props.columnWidths
  ) {
    return props;
  }

  return {
    ...props,
    columns,
    rows,
    headerTexts,
    cellTexts,
    headerStyles,
    cellStyles,
    columnWidths,
  };
}
