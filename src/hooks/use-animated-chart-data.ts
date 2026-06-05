'use client';

import type { ChartData, ChartType } from 'chart.js';
import { useEffect, useRef, useState } from 'react';

import {
  chartDataValuesSnapshotKey,
  chartDataVisualSnapshotKey,
  zeroChartData,
} from '@/lib/dashboard/chart-animation';

/**
 * Chart.js animates updates, not always the first paint when data is already final.
 * Mount with zeroed values, then apply real data on the next frame so initial load animates.
 * Style-only changes (fill, line shape, colors, …) apply immediately without re-running entry animation.
 */
export function useAnimatedChartData<T extends ChartType>(
  chartData: ChartData<T> | null | undefined,
): ChartData<T> | null {
  const valuesKey = chartData ? chartDataValuesSnapshotKey(chartData) : null;
  const visualKey = chartData ? chartDataVisualSnapshotKey(chartData) : null;
  const renderKey = valuesKey && visualKey ? `${valuesKey}\u0000${visualKey}` : null;
  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;
  const prevValuesKeyRef = useRef<string | null>(null);

  const [displayData, setDisplayData] = useState<ChartData<T> | null>(null);

  // renderKey encodes both data values and dataset visuals so style-only edits re-render without re-animating.
  // biome-ignore lint/correctness/useExhaustiveDependencies: renderKey is the intentional trigger
  useEffect(() => {
    const data = chartDataRef.current;
    const currentValuesKey = data ? chartDataValuesSnapshotKey(data) : null;
    if (!data || !currentValuesKey) {
      setDisplayData(null);
      prevValuesKeyRef.current = null;
      return;
    }

    const valuesUnchanged = currentValuesKey === prevValuesKeyRef.current;
    prevValuesKeyRef.current = currentValuesKey;

    if (valuesUnchanged) {
      setDisplayData(data);
      return;
    }

    setDisplayData(zeroChartData(data));

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        setDisplayData(chartDataRef.current ?? null);
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame) {
        cancelAnimationFrame(innerFrame);
      }
    };
  }, [renderKey]);

  return displayData;
}
