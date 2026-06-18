'use client';

import { useFormatter, useLocale } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import type { DashboardWidget } from '@/types/dashboard-layout';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export type ChartComputeContext = {
  loans: DashboardLoan[];
  toDate: Date;
  fieldOptions: EntityFilterFieldOption[];
  locale: string;
  formatMonth: (year: number, month: number) => string;
};

/**
 * Shared compute pipeline for the bar and line chart widgets: profiling wrapper, the
 * locale-aware month formatter, the widget compute cache, and the empty-series guard.
 * The caller supplies a memoized `compute` (closing over its own config + translations).
 */
export function useDashboardChartResult<TResult>(
  widget: DashboardWidget,
  hasSeries: boolean,
  compute: (ctx: ChartComputeContext) => TResult,
): TResult | null {
  const locale = useLocale();
  const formatter = useFormatter();
  const { loans, toDate, fieldOptions, getOrComputeWidgetResult } = useDashboardData();

  const formatMonth = useCallback(
    (year: number, month: number) =>
      formatter.dateTime(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' }),
    [formatter],
  );

  return useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () => {
          if (!hasSeries) {
            return null;
          }
          return getOrComputeWidgetResult(
            buildWidgetComputeCacheKey(widget.type, widget.config, loans.length, toDate.getTime()),
            () => compute({ loans, toDate, fieldOptions, locale, formatMonth }),
          );
        },
      }),
    [
      widget.type,
      widget.id,
      widget.config,
      loans,
      toDate,
      fieldOptions,
      locale,
      formatMonth,
      hasSeries,
      getOrComputeWidgetResult,
      compute,
    ],
  );
}
