import { z } from 'zod';

import { CHART_DATE_GROUPINGS } from '@/types/dashboard-widgets/chart-discriminator';

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

export const chartDiscriminatorSchema = z
  .object({
    groupBy: chartGroupBySchema,
    numericBuckets: z.array(z.number()).max(100).optional(),
    dateGrouping: z.enum(CHART_DATE_GROUPINGS).optional(),
    textTransform: chartTextTransformSchema.optional(),
    topNCategories: z.number().int().min(1).max(50).default(8),
    filters: entityFiltersSchema,
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
  });
