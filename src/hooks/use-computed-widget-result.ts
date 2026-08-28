'use client';

import { useMemo } from 'react';
import { useDashboardLayoutData } from '@/components/dashboard/customizer/dashboard-layout-context';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useDashboardWidgetI18n } from '@/hooks/use-dashboard-widget-i18n';
import { computeWidgetResult } from '@/lib/dashboard/compute-widget-result';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import type { WidgetComputeResult } from '@/lib/dashboard/widget-compute-result-types';
import type { DashboardWidget } from '@/types/dashboard-layout';

export function useComputedWidgetResult(widget: DashboardWidget): WidgetComputeResult {
  const { loans, lenders, toDate, project, getOrComputeWidgetResult, widgetResults, hasFullDataset } =
    useDashboardData();
  const { scope } = useDashboardLayoutData();
  const i18n = useDashboardWidgetI18n();

  return useMemo(() => {
    if (!hasFullDataset) {
      return (
        widgetResults[scope][widget.id] ??
        computeWidgetResult(widget, { loans: [], lenders: [], toDate, project, i18n })
      );
    }

    return profileWidgetCompute({
      widgetType: widget.type,
      widgetId: widget.id,
      loanCount: loans.length,
      compute: () =>
        getOrComputeWidgetResult(
          buildWidgetComputeCacheKey(widget.type, widget.config, loans.length, toDate.getTime()),
          () => computeWidgetResult(widget, { loans, lenders, toDate, project, i18n }),
        ),
    });
  }, [widget, hasFullDataset, widgetResults, scope, loans, lenders, toDate, project, i18n, getOrComputeWidgetResult]);
}
