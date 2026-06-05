import {
  DASHBOARD_WIDGET_WIDTHS,
  type DashboardLayoutData,
  type DashboardLayoutRow,
  type DashboardWidget,
  type DashboardWidgetType,
  type DashboardWidgetWidth,
} from '@/types/dashboard-layout';
import { createDefaultBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { createDefaultHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { createDefaultLineChartConfig } from '@/types/dashboard-widgets/line-chart';
import { createDefaultPieChartConfig } from '@/types/dashboard-widgets/pie-chart';
import { createDefaultStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import { createDefaultLenderTableConfig, createDefaultLoanTableConfig } from '@/types/dashboard-widgets/table-view';

export const DESKTOP_GRID_COLS = 12;
export const MOBILE_GRID_COLS = 12;

/** Largest first — used when shrinking to fit remaining row space */
const WIDTH_ORDER: DashboardWidgetWidth[] = ['full', 'threeQuarters', 'twoThirds', 'half', 'third', 'quarter'];

/** Smallest first — width picker in settings */
export const WIDGET_WIDTH_SETTINGS_ORDER: DashboardWidgetWidth[] = [
  'quarter',
  'third',
  'half',
  'twoThirds',
  'threeQuarters',
  'full',
];

const DESKTOP_COLSPAN: Record<DashboardWidgetWidth, number> = {
  quarter: 3,
  third: 4,
  half: 6,
  twoThirds: 8,
  threeQuarters: 9,
  full: 12,
};

const MOBILE_COLSPAN: Record<DashboardWidgetWidth, number> = {
  quarter: 6,
  third: 12,
  half: 12,
  twoThirds: 12,
  threeQuarters: 12,
  full: 12,
};

const WIDGET_COL_SPAN_CLASS: Record<DashboardWidgetWidth, string> = {
  quarter: 'col-span-6 md:col-span-3',
  third: 'col-span-12 md:col-span-4',
  half: 'col-span-12 md:col-span-6',
  twoThirds: 'col-span-12 md:col-span-8',
  threeQuarters: 'col-span-12 md:col-span-9',
  full: 'col-span-12',
};

export const DEFAULT_WIDTH_BY_TYPE: Record<DashboardWidgetType, DashboardWidgetWidth> = {
  history_table: 'full',
  loan_table_view: 'full',
  lender_table_view: 'full',
  pie_chart: 'half',
  line_chart: 'half',
  bar_chart: 'half',
  stat: 'quarter',
  divider: 'full',
};

export function widgetIsFullWidthLocked(type: DashboardWidgetType): boolean {
  return type === 'divider';
}

export function getEffectiveWidgetColSpanClassName(widget: {
  type: DashboardWidgetType;
  width: DashboardWidgetWidth;
}): string {
  if (widgetIsFullWidthLocked(widget.type)) {
    return WIDGET_COL_SPAN_CLASS.full;
  }
  return getWidgetColSpanClassName(widget.width);
}

export function isDashboardWidgetWidth(value: unknown): value is DashboardWidgetWidth {
  return typeof value === 'string' && (DASHBOARD_WIDGET_WIDTHS as readonly string[]).includes(value);
}

export function getDesktopColspan(width: DashboardWidgetWidth): number {
  return DESKTOP_COLSPAN[width] ?? DESKTOP_COLSPAN.quarter;
}

export function getMobileColspan(width: DashboardWidgetWidth): number {
  return MOBILE_COLSPAN[width] ?? MOBILE_COLSPAN.quarter;
}

/** Tailwind col-span on a 12-column grid (mobile + desktop) */
export function getWidgetColSpanClassName(width: DashboardWidgetWidth): string {
  return WIDGET_COL_SPAN_CLASS[width] ?? WIDGET_COL_SPAN_CLASS.quarter;
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

export function widgetShowsCardHeader(widget: { type: DashboardWidgetType; title: string }): boolean {
  if (widget.type === 'divider') {
    return false;
  }
  if (
    widget.type === 'stat' ||
    widget.type === 'history_table' ||
    widget.type === 'pie_chart' ||
    widget.type === 'bar_chart' ||
    widget.type === 'line_chart' ||
    widget.type === 'loan_table_view' ||
    widget.type === 'lender_table_view'
  ) {
    return widget.title.trim().length > 0;
  }
  return true;
}

/** Single source of truth for the default config of each widget type (used on create + normalize). */
export function createDefaultWidgetConfig(type: DashboardWidgetType): Record<string, unknown> {
  switch (type) {
    case 'history_table':
      return createDefaultHistoryTableConfig();
    case 'stat':
      return createDefaultStatWidgetConfig();
    case 'pie_chart':
      return createDefaultPieChartConfig();
    case 'bar_chart':
      return createDefaultBarChartConfig();
    case 'line_chart':
      return createDefaultLineChartConfig();
    case 'loan_table_view':
      return createDefaultLoanTableConfig();
    case 'lender_table_view':
      return createDefaultLenderTableConfig();
    default:
      return {};
  }
}

export function createWidget(type: DashboardWidgetType, title: string, width?: DashboardWidgetWidth): DashboardWidget {
  const resolvedWidth = widgetIsFullWidthLocked(type) ? 'full' : (width ?? DEFAULT_WIDTH_BY_TYPE[type]);

  return {
    id: crypto.randomUUID(),
    type,
    title,
    width: resolvedWidth,
    config: createDefaultWidgetConfig(type),
  };
}
