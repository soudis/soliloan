import { z } from 'zod';

import {
  PIE_CHART_MEASURES,
  PIE_CHART_MEASURES_WITHOUT_AVERAGE,
  PIE_CHART_MEASURES_WITHOUT_SUM,
  PIE_CHART_SIZES,
} from '@/types/dashboard-widgets/pie-chart';

import { chartDiscriminatorSchema } from './chart-discriminator';

export const pieChartWidgetConfigSchema = chartDiscriminatorSchema
  .extend({
    layoutVersion: z.literal(1).default(1),
    measure: z.enum(PIE_CHART_MEASURES),
    measureAggregation: z.enum(['sum', 'count', 'average']),
    chartVariant: z.enum(['pie', 'donut']).default('pie'),
    chartSize: z.enum(PIE_CHART_SIZES).default('medium'),
  })
  .superRefine((config, ctx) => {
    if (PIE_CHART_MEASURES_WITHOUT_AVERAGE.includes(config.measure) && config.measureAggregation === 'average') {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.pieChart.validation.measureAggregation',
        path: ['measureAggregation'],
      });
    }
    if (PIE_CHART_MEASURES_WITHOUT_SUM.includes(config.measure) && config.measureAggregation === 'sum') {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.pieChart.validation.measureAggregation',
        path: ['measureAggregation'],
      });
    }
  });
