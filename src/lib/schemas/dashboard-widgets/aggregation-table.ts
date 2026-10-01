import { z } from 'zod';

import {
  AGGREGATION_TABLE_SORT_DIRECTIONS,
  resolveAggregationTableSortColumnId,
} from '@/types/dashboard-widgets/aggregation-table';
import { CHART_DATE_GROUPINGS } from '@/types/dashboard-widgets/chart-discriminator';
import {
  isStatAggregationValidForMetric,
  STAT_AGGREGATIONS,
  STAT_DELTA_UNITS,
  STAT_WIDGET_METRICS,
} from '@/types/dashboard-widgets/stat-widget';

import { entityFiltersSchema } from './shared';

const chartGroupBySchema = z.object({
  entity: z.enum(['loan', 'lender']),
  field: z.string().min(1),
});

const chartTextTransformSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('firstChars'), count: z.number().int().positive() }),
  z.object({ kind: z.literal('lastChars'), count: z.number().int().positive() }),
  z.object({ kind: z.literal('firstWord') }),
  z.object({ kind: z.literal('charCount') }),
]);

const statDeltaRangeSchema = z.object({
  amount: z.number().int().positive(),
  unit: z.enum(STAT_DELTA_UNITS),
});

const aggregationTableColumnSchema = z
  .object({
    id: z.string().min(1).max(200),
    title: z.string(),
    metric: z.enum(STAT_WIDGET_METRICS),
    aggregation: z.enum(STAT_AGGREGATIONS),
    deltaRange: statDeltaRangeSchema.optional(),
    colorCodeSign: z.boolean().default(false),
  })
  .superRefine((column, ctx) => {
    if (!isStatAggregationValidForMetric(column.metric, column.aggregation)) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.stat.validation.metricAggregation',
        path: ['aggregation'],
      });
    }
    if (column.aggregation === 'delta' && !column.deltaRange) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.stat.validation.deltaRangeRequired',
        path: ['deltaRange'],
      });
    }
  });

export const aggregationTableWidgetConfigSchema = z
  .object({
    layoutVersion: z.literal(1).default(1),
    groupBy: chartGroupBySchema,
    numericBuckets: z.array(z.number()).max(100).optional(),
    dateGrouping: z.enum(CHART_DATE_GROUPINGS).optional(),
    textTransform: chartTextTransformSchema.optional(),
    filters: entityFiltersSchema,
    columns: z.array(aggregationTableColumnSchema).max(50).default([]),
    sortColumnId: z.string().min(1).max(200),
    sortDirection: z.enum(AGGREGATION_TABLE_SORT_DIRECTIONS).default('desc'),
  })
  .superRefine((config, ctx) => {
    if (config.numericBuckets) {
      const sorted = [...config.numericBuckets].sort((a, b) => a - b);
      for (let i = 0; i < config.numericBuckets.length; i++) {
        if (!Number.isFinite(config.numericBuckets[i])) {
          ctx.addIssue({
            code: 'custom',
            message: 'dashboard.customizer.chartDiscriminator.validation.invalidBucket',
            path: ['numericBuckets', i],
          });
        }
        if (i > 0 && sorted[i] === sorted[i - 1]) {
          ctx.addIssue({
            code: 'custom',
            message: 'dashboard.customizer.chartDiscriminator.validation.duplicateBucket',
            path: ['numericBuckets', i],
          });
        }
      }
    }
  })
  .transform((config) => ({
    ...config,
    sortColumnId: resolveAggregationTableSortColumnId(config.sortColumnId, config.columns),
  }));
