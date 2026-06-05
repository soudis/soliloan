import { z } from 'zod';

import { DASHBOARD_WIDGET_TYPES, DASHBOARD_WIDGET_WIDTHS } from '@/types/dashboard-layout';
import { DESKTOP_GRID_COLS, getDesktopColspan, getRowUsedCols } from '@/lib/dashboard/layout-utils';

const dashboardWidgetWidthSchema = z.enum(DASHBOARD_WIDGET_WIDTHS);

const dashboardWidgetSchema = z
  .object({
    id: z.string().min(1),
    type: z.preprocess(
      (val) => (val === 'yearly_table' ? 'history_table' : val),
      z.enum(DASHBOARD_WIDGET_TYPES),
    ),
    title: z.string(),
    width: dashboardWidgetWidthSchema,
    config: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((widget, ctx) => {
    if (
      widget.type !== 'stat' &&
      widget.type !== 'history_table' &&
      widget.type !== 'pie_chart' &&
      widget.type !== 'bar_chart' &&
      widget.type !== 'line_chart' &&
      widget.type !== 'divider' &&
      !widget.title.trim()
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.validation.titleRequired',
        path: ['title'],
      });
    }
  });

const dashboardLayoutRowSchema = z.object({
  id: z.string().min(1),
  widgets: z.array(dashboardWidgetSchema),
});

export const dashboardLayoutDataSchema = z
  .object({
    rows: z.array(dashboardLayoutRowSchema),
  })
  .superRefine((data, ctx) => {
    for (const [rowIndex, row] of data.rows.entries()) {
      const used = getRowUsedCols(row.widgets);
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
  });

export const upsertProjectDashboardLayoutSchema = z.object({
  projectId: z.string(),
  layout: dashboardLayoutDataSchema,
});

export const upsertUserDashboardLayoutSchema = z.object({
  layout: dashboardLayoutDataSchema,
});

export const copyDashboardLayoutSchema = z.object({
  projectId: z.string(),
  sourceScope: z.enum(['project', 'user']),
  targetScope: z.enum(['project', 'user']),
});

export const upsertGlobalDashboardLayoutSchema = z.object({
  layout: dashboardLayoutDataSchema,
});
