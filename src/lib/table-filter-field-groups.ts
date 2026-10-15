export type FilterFieldColumn = {
  id: string;
  visible: boolean;
  groupKey: string | null;
  groupOrder: number;
};

export type FilterFieldMenuGroup = {
  key: string;
  columnIds: string[];
};

/** Visible columns first, then hidden columns in the Spalten group order. */
export function buildFilterFieldMenuGroups(columns: readonly FilterFieldColumn[]): FilterFieldMenuGroup[] {
  const shown = columns.filter((column) => column.visible).map((column) => column.id);
  const hidden = columns.filter((column) => !column.visible);
  const groups: FilterFieldMenuGroup[] = [];

  if (shown.length > 0) {
    groups.push({ key: 'shown', columnIds: shown });
  }

  const ungrouped = hidden.filter((column) => !column.groupKey).map((column) => column.id);
  if (ungrouped.length > 0) {
    groups.push({ key: 'ungrouped', columnIds: ungrouped });
  }

  const grouped = new Map<string, { order: number; columnIds: string[] }>();
  for (const column of hidden) {
    if (!column.groupKey) {
      continue;
    }
    const existing = grouped.get(column.groupKey);
    if (existing) {
      existing.columnIds.push(column.id);
      continue;
    }
    grouped.set(column.groupKey, { order: column.groupOrder, columnIds: [column.id] });
  }

  const orderedGroups = [...grouped.entries()].sort(([, left], [, right]) => left.order - right.order);
  for (const [key, group] of orderedGroups) {
    groups.push({ key, columnIds: group.columnIds });
  }

  return groups;
}
