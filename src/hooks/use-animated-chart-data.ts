'use client';

import type { ChartData, ChartType } from 'chart.js';
import { useEffect, useRef, useState } from 'react';

import { chartDataSnapshotKey, zeroChartData } from '@/lib/dashboard/chart-animation';

/**
 * Chart.js animates updates, not always the first paint when data is already final.
 * Mount with zeroed values, then apply real data on the next frame so initial load animates.
 */
export function useAnimatedChartData<T extends ChartType>(
  chartData: ChartData<T> | null | undefined,
): ChartData<T> | null {
  const snapshotKey = chartData ? chartDataSnapshotKey(chartData) : null;
  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;

  const [displayData, setDisplayData] = useState<ChartData<T> | null>(null);

  useEffect(() => {
    const data = chartDataRef.current;
    if (!data || !snapshotKey) {
      setDisplayData(null);
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
  }, [snapshotKey]);

  return displayData;
}
