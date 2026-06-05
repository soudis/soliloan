import type { TableViewDisplayMode, TableViewSort } from '@/types/dashboard-widgets/table-view';

export type SortValueReader<T> = (row: T, columnId: string) => string | number | Date | null | undefined;

function compareSortValues(
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined,
): number {
  if (a === b) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b));
}

export function sortTableRows<T>(rows: T[], sort: TableViewSort, getSortValue: SortValueReader<T>): T[] {
  if (!sort) {
    return rows;
  }

  const sorted = [...rows];
  sorted.sort((rowA, rowB) => {
    const cmp = compareSortValues(getSortValue(rowA, sort.columnId), getSortValue(rowB, sort.columnId));
    return sort.desc ? -cmp : cmp;
  });
  return sorted;
}

export function applyTableViewSlice<T>(rows: T[], displayMode: TableViewDisplayMode, rowLimit: number): T[] {
  if (displayMode === 'fixed') {
    return rows.slice(0, rowLimit);
  }
  return rows;
}

export function applyTableView<T>({
  rows,
  sort,
  displayMode,
  rowLimit,
  getSortValue,
}: {
  rows: T[];
  sort: TableViewSort;
  displayMode: TableViewDisplayMode;
  rowLimit: number;
  getSortValue: SortValueReader<T>;
}): T[] {
  const sorted = sortTableRows(rows, sort, getSortValue);
  return applyTableViewSlice(sorted, displayMode, rowLimit);
}
