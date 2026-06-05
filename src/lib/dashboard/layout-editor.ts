import {
  createEmptyRow,
  createWidget,
  DEFAULT_WIDTH_BY_TYPE,
  DESKTOP_GRID_COLS,
  fitWidgetWidthToRow,
  getRowRemainingCols,
  widgetIsFullWidthLocked,
} from '@/lib/dashboard/layout-utils';
import type {
  DashboardLayoutData,
  DashboardLayoutRow,
  DashboardWidget,
  DashboardWidgetType,
} from '@/types/dashboard-layout';

export function findRowIndex(layout: DashboardLayoutData, rowId: string): number {
  return layout.rows.findIndex((r) => r.id === rowId);
}

export function findWidgetLocation(layout: DashboardLayoutData, widgetId: string) {
  for (let rowIndex = 0; rowIndex < layout.rows.length; rowIndex++) {
    const row = layout.rows[rowIndex];
    if (!row) {
      continue;
    }
    const widgetIndex = row.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex >= 0) {
      const widget = row.widgets[widgetIndex];
      if (widget) {
        return { row, rowIndex, widgetIndex, widget };
      }
    }
  }
  return null;
}

export function updateLayout(
  layout: DashboardLayoutData,
  updater: (rows: DashboardLayoutRow[]) => DashboardLayoutRow[],
) {
  return { rows: updater([...layout.rows]) };
}

export function addRow(layout: DashboardLayoutData, afterIndex?: number): DashboardLayoutData {
  const newRow = createEmptyRow();
  const rows = [...layout.rows];
  if (afterIndex === undefined || afterIndex >= rows.length - 1) {
    rows.push(newRow);
  } else {
    rows.splice(afterIndex + 1, 0, newRow);
  }
  return { rows };
}

export function removeRowIfEmpty(layout: DashboardLayoutData, rowId: string): DashboardLayoutData {
  const rows = layout.rows.filter((row) => row.id !== rowId || row.widgets.length > 0);
  if (rows.length === 0) {
    return { rows: [createEmptyRow()] };
  }
  return { rows };
}

export function insertWidgetInRow(
  layout: DashboardLayoutData,
  rowId: string,
  widget: DashboardWidget,
  index?: number,
): DashboardLayoutData | null {
  const row = layout.rows.find((r) => r.id === rowId);
  if (!row) {
    return null;
  }
  const remaining = getRowRemainingCols(row.widgets);
  const preferredWidth = widgetIsFullWidthLocked(widget.type) ? 'full' : widget.width;
  const fitted = fitWidgetWidthToRow(remaining, preferredWidth);
  if (!fitted) {
    return null;
  }
  const newWidget = {
    ...widget,
    width: widgetIsFullWidthLocked(widget.type) ? 'full' : fitted,
  };
  return updateLayout(layout, (rows) =>
    rows.map((r) => {
      if (r.id !== rowId) {
        return r;
      }
      const widgets = [...r.widgets];
      const at = index === undefined ? widgets.length : Math.min(index, widgets.length);
      widgets.splice(at, 0, newWidget);
      return { ...r, widgets };
    }),
  );
}

export function addWidgetFromType(
  layout: DashboardLayoutData,
  rowId: string,
  type: DashboardWidgetType,
  title: string,
  index?: number,
): { layout: DashboardLayoutData; created: boolean } {
  const preferred = DEFAULT_WIDTH_BY_TYPE[type];
  const widget = createWidget(type, title, preferred);
  const updated = insertWidgetInRow(layout, rowId, widget, index);
  if (updated) {
    return { layout: updated, created: true };
  }
  return { layout, created: false };
}

export function insertWidgetInNewRowAfter(
  layout: DashboardLayoutData,
  widget: DashboardWidget,
  afterRowIndex?: number,
): DashboardLayoutData {
  const withRow = addRow(layout, afterRowIndex);
  const newRowIndex =
    afterRowIndex === undefined || afterRowIndex >= layout.rows.length - 1
      ? withRow.rows.length - 1
      : afterRowIndex + 1;
  const newRow = withRow.rows[newRowIndex];
  if (!newRow) {
    return withRow;
  }
  const fitted = fitWidgetWidthToRow(DESKTOP_GRID_COLS, widget.width) ?? widget.width;
  const newWidget = { ...widget, width: fitted };
  return updateLayout(withRow, (rows) => rows.map((r) => (r.id === newRow.id ? { ...r, widgets: [newWidget] } : r)));
}

export function addWidgetFromTypeInNewRow(
  layout: DashboardLayoutData,
  type: DashboardWidgetType,
  title: string,
  afterRowIndex?: number,
): DashboardLayoutData {
  const widget = createWidget(type, title, DEFAULT_WIDTH_BY_TYPE[type]);
  return insertWidgetInNewRowAfter(layout, widget, afterRowIndex);
}

export function removeWidget(layout: DashboardLayoutData, widgetId: string): DashboardLayoutData {
  const next = updateLayout(layout, (rows) =>
    rows.map((row) => {
      // Preserve untouched row references so memoized rows can skip re-rendering.
      if (!row.widgets.some((w) => w.id === widgetId)) {
        return row;
      }
      return {
        ...row,
        widgets: row.widgets.filter((w) => w.id !== widgetId),
      };
    }),
  );
  const cleaned = next.rows
    .map((row) => (row.widgets.length === 0 && next.rows.length > 1 ? null : row))
    .filter((r): r is DashboardLayoutRow => r !== null);
  if (cleaned.length === 0) {
    return { rows: [createEmptyRow()] };
  }
  return { rows: cleaned };
}

export function moveWidgetToRow(
  layout: DashboardLayoutData,
  widgetId: string,
  targetRowId: string,
  targetIndex?: number,
): DashboardLayoutData | null {
  const loc = findWidgetLocation(layout, widgetId);
  if (!loc) {
    return null;
  }
  let without = removeWidget(layout, widgetId);
  without = removeRowIfEmpty(without, loc.row.id);
  const widget = loc.widget;
  const inserted = insertWidgetInRow(without, targetRowId, widget, targetIndex);
  if (inserted) {
    return inserted;
  }
  const targetRowIndex = findRowIndex(without, targetRowId);
  return insertWidgetInNewRowAfter(without, widget, targetRowIndex >= 0 ? targetRowIndex : undefined);
}

export function reorderWidgetInRow(
  layout: DashboardLayoutData,
  rowId: string,
  activeId: string,
  overId: string,
): DashboardLayoutData {
  return updateLayout(layout, (rows) =>
    rows.map((row) => {
      if (row.id !== rowId) {
        return row;
      }
      const oldIndex = row.widgets.findIndex((w) => w.id === activeId);
      const newIndex = row.widgets.findIndex((w) => w.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return row;
      }
      const widgets = [...row.widgets];
      const [moved] = widgets.splice(oldIndex, 1);
      if (!moved) {
        return row;
      }
      widgets.splice(newIndex, 0, moved);
      return { ...row, widgets };
    }),
  );
}

export function updateWidget(
  layout: DashboardLayoutData,
  widgetId: string,
  patch: Partial<Pick<DashboardWidget, 'title' | 'width' | 'config'>>,
): DashboardLayoutData {
  const loc = findWidgetLocation(layout, widgetId);
  if (!loc) {
    return layout;
  }
  if (widgetIsFullWidthLocked(loc.widget.type)) {
    patch = { ...patch, width: 'full' };
  } else if (patch.width) {
    const others = loc.row.widgets.filter((w) => w.id !== widgetId);
    const remaining = getRowRemainingCols(others);
    const fitted = fitWidgetWidthToRow(remaining, patch.width);
    if (!fitted) {
      return layout;
    }
    patch = { ...patch, width: fitted };
  }
  return updateLayout(layout, (rows) =>
    rows.map((row) => {
      // Preserve the reference of rows that don't contain the edited widget so
      // memoized rows can skip re-rendering.
      if (!row.widgets.some((w) => w.id === widgetId)) {
        return row;
      }
      return {
        ...row,
        widgets: row.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
      };
    }),
  );
}
