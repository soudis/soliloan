import { z } from 'zod';

import { HISTORY_TABLE_METRICS, isHistoryMetricColumnValid } from '@/types/dashboard-widgets/history-table';

const entityFilterSchema = z.object({
  id: z.string(),
  field: z.string(),
  entity: z.enum(['loan', 'lender']),
  value: z.unknown(),
});

const historyTableColumnSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    metric: z.enum(HISTORY_TABLE_METRICS),
    aggregation: z.enum(['delta', 'cumulative']),
    filters: z.array(entityFilterSchema).default([]),
  })
  .superRefine((col, ctx) => {
    if (!isHistoryMetricColumnValid(col.metric, col.aggregation)) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.historyTable.validation.metricAggregation',
        path: ['aggregation'],
      });
    }
  });

export const historyTableWidgetConfigSchema = z
  .object({
    layoutVersion: z.literal(1).default(1),
    periodMode: z.enum(['yearly', 'monthly']).default('yearly'),
    periodCount: z.number().int().positive().nullable().optional(),
    columns: z.array(historyTableColumnSchema).default([]),
  })
  .superRefine((config, ctx) => {
    if (config.periodMode === 'monthly' && config.periodCount && config.periodCount > 24) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.historyTable.validation.maxMonths',
        path: ['periodCount'],
      });
    }
  });
