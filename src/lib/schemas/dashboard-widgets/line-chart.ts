import { z } from 'zod';
import {
  LINE_CHART_DASH_STYLES,
  LINE_CHART_LINE_SHAPES,
  LINE_CHART_LINE_WIDTH_MAX,
  LINE_CHART_LINE_WIDTH_MIN,
} from '@/types/dashboard-widgets/line-chart-series';
import { PIE_CHART_SIZES } from '@/types/dashboard-widgets/pie-chart';

import { chartDiscriminatorSchema } from './chart-discriminator';
import { historyTableColumnSchema } from './history-table';

const lineChartSeriesSchema = historyTableColumnSchema.extend({
  filled: z.boolean().default(false),
  lineShape: z.enum(LINE_CHART_LINE_SHAPES).default('straight'),
  showPoints: z.boolean().default(true),
  lineWidth: z.number().int().min(LINE_CHART_LINE_WIDTH_MIN).max(LINE_CHART_LINE_WIDTH_MAX).default(2),
  dashStyle: z.enum(LINE_CHART_DASH_STYLES).default('solid'),
});

export const lineChartWidgetConfigSchema = z
  .object({
    layoutVersion: z.literal(1).default(1),
    xAxisMode: z.enum(['timeline', 'discriminator']).default('timeline'),
    timeline: z
      .object({
        periodMode: z.enum(['yearly', 'monthly']).default('yearly'),
        periodCount: z.number().int().positive().nullable().optional(),
      })
      .default({ periodMode: 'yearly', periodCount: null }),
    discriminator: chartDiscriminatorSchema.default({
      groupBy: { entity: 'loan', field: 'status' },
      topNCategories: 8,
      filters: [],
    }),
    series: z.array(lineChartSeriesSchema).max(50).default([]),
    beginAtZero: z.boolean().default(true),
    chartSize: z.enum(PIE_CHART_SIZES).default('medium'),
  })
  .superRefine((config, ctx) => {
    if (config.timeline.periodMode === 'monthly' && config.timeline.periodCount && config.timeline.periodCount > 24) {
      ctx.addIssue({
        code: 'custom',
        message: 'dashboard.customizer.historyTable.validation.maxMonths',
        path: ['timeline', 'periodCount'],
      });
    }
    if (config.xAxisMode === 'discriminator') {
      for (let i = 0; i < config.series.length; i++) {
        const series = config.series[i];
        if (series && series.aggregation === 'delta') {
          ctx.addIssue({
            code: 'custom',
            message: 'dashboard.customizer.barChart.validation.discriminatorNoDelta',
            path: ['series', i, 'aggregation'],
          });
        }
      }
    }
  });
