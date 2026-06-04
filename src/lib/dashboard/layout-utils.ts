import { createDefaultHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { createDefaultStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import type {
  DashboardLayoutData,
  DashboardLayoutRow,
  DashboardWidget,
  DashboardWidgetType,
  DashboardWidgetWidth,
} from '@/types/dashboard-layout';

export const DESKTOP_GRID_COLS = 4;
export const MOBILE_GRID_COLS = 2;

const WIDTH_ORDER: DashboardWidgetWidth[] = ['full', 'half', 'quarter'];

export const DEFAULT_WIDTH_BY_TYPE: Record<DashboardWidgetType, DashboardWidgetWidth> = {
  history_table: 'full',
  loan_table_view: 'full',
  lender_table_view: 'full',
  pie_chart: 'half',
  line_chart: 'half',
  bar_chart: 'half',
  stat: 'quarter',
};

export function getDesktopColspan(width: DashboardWidgetWidth): number {
  switch (width) {
    case 'quarter':
      return 1;
    case 'half':
      return 2;
    case 'full':
      return 4;
    default:
      return 1;
  }
}

/** Tailwind col-span classes: mobile 2-col grid, desktop 4-col grid */
export function getWidgetColSpanClassName(width: DashboardWidgetWidth): string {
  switch (width) {
    case 'quarter':
      return 'col-span-2 md:col-span-1';
    case 'half':
      return 'col-span-4 md:col-span-2';
    case 'full':
      return 'col-span-4';
    default:
      return 'col-span-4 md:col-span-1';
  }
}

export function getRowUsedCols(widgets: DashboardWidget[]): number {
  return widgets.reduce((sum, w) => sum + getDesktopColspan(w.width), 0);
}

export function getRowRemainingCols(widgets: DashboardWidget[]): number {
  return Math.max(0, DESKTOP_GRID_COLS - getRowUsedCols(widgets));
}

export function fitWidgetWidthToRow(
  remainingCols: number,
  preferredWidth: DashboardWidgetWidth,
): DashboardWidgetWidth | null {
  if (remainingCols <= 0) {
    return null;
  }
  const startIndex = WIDTH_ORDER.indexOf(preferredWidth);
  const order = startIndex >= 0 ? WIDTH_ORDER.slice(startIndex) : WIDTH_ORDER;
  for (const width of order) {
    if (getDesktopColspan(width) <= remainingCols) {
      return width;
    }
  }
  for (const width of WIDTH_ORDER) {
    if (getDesktopColspan(width) <= remainingCols) {
      return width;
    }
  }
  return null;
}

export function cloneLayoutData(layout: DashboardLayoutData): DashboardLayoutData {
  return structuredClone(layout);
}

export function createEmptyRow(): DashboardLayoutRow {
  return {
    id: crypto.randomUUID(),
    widgets: [],
  };
}

export function createDefaultLayoutData(): DashboardLayoutData {
  return {
    rows: [createEmptyRow()],
  };
}

export function createWidget(
  type: DashboardWidgetType,
  title: string,
  width?: DashboardWidgetWidth,
): DashboardWidget {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    width: width ?? DEFAULT_WIDTH_BY_TYPE[type],
    config:
      type === 'history_table'
        ? createDefaultHistoryTableConfig()
        : type === 'stat'
          ? createDefaultStatWidgetConfig()
          : {},
  };
}
