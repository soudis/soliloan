'use client';

import { ChartTextTransformFields } from '@/components/dashboard/customizer/chart/chart-text-transform-fields';
import type { ChartTextTransform } from '@/types/dashboard-widgets/chart-discriminator';

/** @deprecated Use ChartTextTransformFields */
export function PieChartTextTransformFields({
  value,
  onChange,
}: {
  value: ChartTextTransform | undefined;
  onChange: (value: ChartTextTransform | undefined) => void;
}) {
  return (
    <ChartTextTransformFields
      value={value}
      onChange={onChange}
      translationNamespace="dashboard.customizer.chartDiscriminator"
    />
  );
}
