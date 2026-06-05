import { z } from 'zod';

import { HISTORY_TABLE_METRICS, isHistoryMetricColumnValid } from '@/types/dashboard-widgets/history-table';

import { entityFiltersSchema } from './shared';

export const historyTableColumnSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    metric: z.enum(HISTORY_TABLE_METRICS),
    aggregation: z.enum(['cumulative', 'delta']),
    colorCodeSign: z.boolean().default(false),
    filters: entityFiltersSchema,
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
    columns: z.array(historyTableColumnSchema).max(50).default([]),
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
