import { createDefaultBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { createDefaultHistoryTableConfig } from '@/types/dashboard-widgets/history-table';
import { createDefaultPieChartConfig } from '@/types/dashboard-widgets/pie-chart';
import { createDefaultStatWidgetConfig } from '@/types/dashboard-widgets/stat-widget';
import {
  DASHBOARD_WIDGET_WIDTHS,
  type DashboardLayoutData,
  type DashboardLayoutRow,
  type DashboardWidget,
  type DashboardWidgetType,
  type DashboardWidgetWidth,
} from '@/types/dashboard-layout';

export const DESKTOP_GRID_COLS = 12;
export const MOBILE_GRID_COLS = 12;

/** Largest first — used when shrinking to fit remaining row space */
const WIDTH_ORDER: DashboardWidgetWidth[] = [
  'full',
  'threeQuarters',
  'twoThirds',
  'half',
  'third',
  'quarter',
];

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
    widget.type === 'bar_chart'
  ) {
    return widget.title.trim().length > 0;
  }
  return true;
}

export function createWidget(
  type: DashboardWidgetType,
  title: string,
  width?: DashboardWidgetWidth,
): DashboardWidget {
  const resolvedWidth = widgetIsFullWidthLocked(type)
    ? 'full'
    : (width ?? DEFAULT_WIDTH_BY_TYPE[type]);

  return {
    id: crypto.randomUUID(),
    type,
    title,
    width: resolvedWidth,
    config:
      type === 'history_table'
        ? createDefaultHistoryTableConfig()
        : type === 'stat'
          ? createDefaultStatWidgetConfig()
          : type === 'pie_chart'
            ? createDefaultPieChartConfig()
            : type === 'bar_chart'
              ? createDefaultBarChartConfig()
              : {},
  };
}
