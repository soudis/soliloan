import { z } from 'zod';

import {
  PIE_CHART_DATE_GROUPINGS,
  PIE_CHART_MEASURES,
  PIE_CHART_MEASURES_WITHOUT_AVERAGE,
  PIE_CHART_SIZES,
} from '@/types/dashboard-widgets/pie-chart';

const entityFilterSchema = z.object({
  id: z.string(),
  field: z.string(),
  entity: z.enum(['loan', 'lender']),
  value: z.unknown(),
});

const pieChartGroupBySchema = z.object({
  entity: z.enum(['loan', 'lender']),
  field: z.string().min(1),
});

const pieChartTextTransformSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('firstChars'), count: z.number().int().positive() }),
  z.object({ kind: z.literal('lastChars'), count: z.number().int().positive() }),
  z.object({ kind: z.literal('firstWord') }),
  z.object({ kind: z.literal('charCount') }),
]);

export const pieChartWidgetConfigSchema = z
  .object({
    layoutVersion: z.literal(1).default(1),
    groupBy: pieChartGroupBySchema,
    numericBuckets: z.array(z.number()).optional(),
    dateGrouping: z.enum(PIE_CHART_DATE_GROUPINGS).optional(),
    textTransform: pieChartTextTransformSchema.optional(),
    measure: z.enum(PIE_CHART_MEASURES),
    measureAggregation: z.enum(['sum', 'count', 'average']),
    topNCategories: z.number().int().min(1).max(50).default(8),
    chartVariant: z.enum(['pie', 'donut']).default('pie'),
    chartSize: z.enum(PIE_CHART_SIZES).default('medium'),
    filters: z.array(entityFilterSchema).default([]),
  })
  .superRefine((config, ctx) => {
    if (PIE_CHART_MEASURES_WITHOUT_AVERAGE.includes(config.measure) && config.measureAggregation === 'average') {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.pieChart.validation.measureAggregation',
        path: ['measureAggregation'],
      });
    }
    if (config.numericBuckets) {
      const sorted = [...config.numericBuckets].sort((a, b) => a - b);
      for (let i = 0; i < config.numericBuckets.length; i++) {
        if (!Number.isFinite(config.numericBuckets[i])) {
          ctx.addIssue({
            code: 'custom',
            message: 'dashboard.customizer.pieChart.validation.invalidBucket',
            path: ['numericBuckets', i],
          });
        }
        if (i > 0 && sorted[i] === sorted[i - 1]) {
          ctx.addIssue({
            code: 'custom',
            message: 'dashboard.customizer.pieChart.validation.duplicateBucket',
            path: ['numericBuckets', i],
          });
        }
      }
    }
  });
