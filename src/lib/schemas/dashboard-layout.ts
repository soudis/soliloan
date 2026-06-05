import { z } from 'zod';

import { DESKTOP_GRID_COLS, getDesktopColspan } from '@/lib/dashboard/layout-utils';
import {
  DASHBOARD_WIDGET_TYPES,
  DASHBOARD_WIDGET_WIDTHS,
  type DashboardWidgetType,
  type DashboardWidgetWidth,
} from '@/types/dashboard-layout';

import { barChartWidgetConfigSchema } from './dashboard-widgets/bar-chart';
import { historyTableWidgetConfigSchema } from './dashboard-widgets/history-table';
import { lenderTableWidgetConfigSchema } from './dashboard-widgets/lender-table';
import { lineChartWidgetConfigSchema } from './dashboard-widgets/line-chart';
import { loanTableWidgetConfigSchema } from './dashboard-widgets/loan-table';
import { pieChartWidgetConfigSchema } from './dashboard-widgets/pie-chart';
import { statWidgetConfigSchema } from './dashboard-widgets/stat-widget';

const MAX_WIDGET_ID_LENGTH = 200;
const MAX_WIDGET_TITLE_LENGTH = 200;
const MAX_ROWS_PER_LAYOUT = 50;
const MAX_WIDGETS_PER_ROW = 24;

const dashboardWidgetWidthSchema = z.enum(DASHBOARD_WIDGET_WIDTHS);

/** Divider has no configurable state; accept (and discard) any stored body. */
const dividerConfigSchema = z.object({}).default({});

/** Per-type config validators used to harden the save path. */
const WIDGET_CONFIG_SCHEMAS: Record<DashboardWidgetType, z.ZodTypeAny> = {
  history_table: historyTableWidgetConfigSchema,
  pie_chart: pieChartWidgetConfigSchema,
  bar_chart: barChartWidgetConfigSchema,
  line_chart: lineChartWidgetConfigSchema,
  stat: statWidgetConfigSchema,
  loan_table_view: loanTableWidgetConfigSchema,
  lender_table_view: lenderTableWidgetConfigSchema,
  divider: dividerConfigSchema,
};

const TITLE_OPTIONAL_TYPES: ReadonlySet<DashboardWidgetType> = new Set([
  'stat',
  'history_table',
  'pie_chart',
  'bar_chart',
  'line_chart',
  'loan_table_view',
  'lender_table_view',
  'divider',
]);

const dashboardWidgetBaseSchema = z.object({
  id: z.string().min(1).max(MAX_WIDGET_ID_LENGTH),
  type: z.preprocess((val) => (val === 'yearly_table' ? 'history_table' : val), z.enum(DASHBOARD_WIDGET_TYPES)),
  title: z.string().max(MAX_WIDGET_TITLE_LENGTH),
  width: dashboardWidgetWidthSchema,
  config: z.record(z.string(), z.unknown()).default({}),
});

type DashboardWidgetBase = z.infer<typeof dashboardWidgetBaseSchema>;

function refineWidgetTitle(widget: DashboardWidgetBase, ctx: z.RefinementCtx) {
  if (!TITLE_OPTIONAL_TYPES.has(widget.type) && !widget.title.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'dashboard.customizer.validation.titleRequired',
      path: ['title'],
    });
  }
}

/**
 * Build the widget schema. When `validateConfig` is true (the save path) each widget's `config`
 * is validated and canonicalized with its type-specific schema instead of the permissive
 * `z.record`. The lenient variant (read/back-compat path) leaves `config` untouched so existing
 * persisted layouts keep loading even if their shape predates a schema change.
 */
function createWidgetSchema(validateConfig: boolean) {
  const withTitle = dashboardWidgetBaseSchema.superRefine(refineWidgetTitle);
  if (!validateConfig) {
    return withTitle;
  }
  return withTitle.transform((widget, ctx) => {
    const configSchema = WIDGET_CONFIG_SCHEMAS[widget.type];
    const result = configSchema.safeParse(widget.config);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['config', ...issue.path] });
      }
      return z.NEVER;
    }
    return { ...widget, config: result.data as Record<string, unknown> };
  });
}

type LayoutRowsForRefine = {
  rows: Array<{ widgets: Array<{ type: DashboardWidgetType; width: DashboardWidgetWidth }> }>;
};

function refineLayoutRows(data: LayoutRowsForRefine, ctx: z.RefinementCtx) {
  for (const [rowIndex, row] of data.rows.entries()) {
    const used = row.widgets.reduce((sum, widget) => sum + getDesktopColspan(widget.width), 0);
    if (used > DESKTOP_GRID_COLS) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.validation.rowOverflow',
        path: ['rows', rowIndex],
      });
    }
    for (const [widgetIndex, widget] of row.widgets.entries()) {
      if (widget.type === 'divider' && widget.width !== 'full') {
        ctx.addIssue({
          code: 'custom',
          message: 'dashboard.customizer.validation.dividerMustBeFullWidth',
          path: ['rows', rowIndex, 'widgets', widgetIndex, 'width'],
        });
      }
      if (getDesktopColspan(widget.width) > DESKTOP_GRID_COLS) {
        ctx.addIssue({
          code: 'custom',
          message: 'dashboard.customizer.validation.invalidWidth',
          path: ['rows', rowIndex, 'widgets', widgetIndex, 'width'],
        });
      }
    }
  }
}

function createLayoutDataSchema(validateConfig: boolean) {
  const widgetSchema = createWidgetSchema(validateConfig);
  const rowSchema = z.object({
    id: z.string().min(1).max(MAX_WIDGET_ID_LENGTH),
    widgets: z.array(widgetSchema).max(MAX_WIDGETS_PER_ROW),
  });
  return z
    .object({
      rows: z.array(rowSchema).max(MAX_ROWS_PER_LAYOUT),
    })
    .superRefine(refineLayoutRows);
}

/** Lenient: used when reading persisted layouts (config left as-is). */
export const dashboardLayoutDataSchema = createLayoutDataSchema(false);

/** Strict: validates + canonicalizes each widget config. Use on every write. */
export const dashboardLayoutDataSaveSchema = createLayoutDataSchema(true);

export const upsertProjectDashboardLayoutSchema = z.object({
  projectId: z.string(),
  layout: dashboardLayoutDataSaveSchema,
});

export const upsertUserDashboardLayoutSchema = z.object({
  layout: dashboardLayoutDataSaveSchema,
});

export const copyDashboardLayoutSchema = z.object({
  projectId: z.string(),
  sourceScope: z.enum(['project', 'user']),
  targetScope: z.enum(['project', 'user']),
});

export const upsertGlobalDashboardLayoutSchema = z.object({
  layout: dashboardLayoutDataSaveSchema,
});
