import { z } from 'zod';

import {
  CUMULATIVE_ONLY_STAT_METRICS,
  isStatAvgMedianAggregation,
  STAT_AGGREGATIONS,
  STAT_DELTA_UNITS,
  STAT_GRID_COLUMNS_MAX,
  STAT_GRID_COLUMNS_MIN,
  STAT_METRICS_WITHOUT_AVG_MEDIAN,
  STAT_WIDGET_LAYOUT_MODES,
  STAT_WIDGET_METRICS,
} from '@/types/dashboard-widgets/stat-widget';

import { entityFiltersSchema } from './shared';

const statDeltaRangeSchema = z.object({
  amount: z.number().int().positive(),
  unit: z.enum(STAT_DELTA_UNITS),
});

const statItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    displayType: z.enum(['main', 'secondary']),
    metric: z.enum(STAT_WIDGET_METRICS),
    aggregation: z.enum(STAT_AGGREGATIONS),
    deltaRange: statDeltaRangeSchema.optional(),
    colorCodeSign: z.boolean().default(false),
    filters: entityFiltersSchema,
  })
  .superRefine((stat, ctx) => {
    if (CUMULATIVE_ONLY_STAT_METRICS.includes(stat.metric) && stat.aggregation === 'delta') {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.stat.validation.metricAggregation',
        path: ['aggregation'],
      });
    }
    if (STAT_METRICS_WITHOUT_AVG_MEDIAN.includes(stat.metric) && isStatAvgMedianAggregation(stat.aggregation)) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.stat.validation.metricAggregationAvgMed',
        path: ['aggregation'],
      });
    }
    if (stat.aggregation === 'delta' && !stat.deltaRange) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.stat.validation.deltaRangeRequired',
        path: ['deltaRange'],
      });
    }
  });

export const statWidgetConfigSchema = z
  .object({
    layoutVersion: z.literal(1).default(1),
    layoutMode: z.enum(STAT_WIDGET_LAYOUT_MODES).default('flexible'),
    gridColumns: z.number().int().min(STAT_GRID_COLUMNS_MIN).max(STAT_GRID_COLUMNS_MAX).optional(),
    stats: z.array(statItemSchema).max(50).default([]),
  })
  .superRefine((config, ctx) => {
    if (config.layoutMode === 'grid' && config.gridColumns == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.stat.validation.gridColumnsRequired',
        path: ['gridColumns'],
      });
    }
  });
