import { z } from 'zod';

import { DASHBOARD_WIDGET_TYPES } from '@/types/dashboard-layout';
import { getDesktopColspan, getRowUsedCols } from '@/lib/dashboard/layout-utils';

const dashboardWidgetWidthSchema = z.enum(['quarter', 'half', 'full']);

const dashboardWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.preprocess(
    (val) => (val === 'yearly_table' ? 'history_table' : val),
    z.enum(DASHBOARD_WIDGET_TYPES),
  ),
  title: z.string().min(1),
  width: dashboardWidgetWidthSchema,
  config: z.record(z.string(), z.unknown()).default({}),
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
      if (used > 4) {
        ctx.addIssue({
          code: 'custom',
          message: 'dashboard.customizer.validation.rowOverflow',
          path: ['rows', rowIndex],
        });
      }
      for (const [widgetIndex, widget] of row.widgets.entries()) {
        if (getDesktopColspan(widget.width) > 4) {
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
