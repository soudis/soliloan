'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { DashboardLender } from '@/actions/dashboard/get-dashboard-stats';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useRouter } from '@/i18n/navigation';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import {
  buildAllLenderTableColumns,
  getLenderSortValue,
} from '@/lib/dashboard/table-widget/lender-table-column-registry';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import { lenderMatchesFilters } from '@/lib/entity-filters/apply-lender-filters';
import { buildLenderFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseLenderTableConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewWidget } from './table-view-widget';

export function LenderTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.lenderTable');
  const tLenders = useTranslations('dashboard.lenders');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { lenders, project, getOrComputeWidgetResult } = useDashboardData();

  const config = useMemo(() => parseLenderTableConfig(widget.config), [widget.config]);

  const fieldOptions = useMemo(
    () => buildLenderFilterFieldOptions(project, tLenders, tLoans, commonT),
    [project, tLenders, tLoans, commonT],
  );

  const columns = useMemo(
    () => buildAllLenderTableColumns<DashboardLender>(project, tLenders, tLoans, commonT, locale),
    [project, tLenders, tLoans, commonT, locale],
  );

  const filteredLenders = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: lenders.length,
        compute: () =>
          getOrComputeWidgetResult(buildWidgetComputeCacheKey(widget.type, widget.config, lenders.length, 0), () =>
            lenders.filter((lender) => lenderMatchesFilters(lender, config.filters, fieldOptions)),
          ),
      }),
    [widget.type, widget.id, widget.config, lenders, config.filters, fieldOptions, getOrComputeWidgetResult],
  );

  const getSortValue = useCallback(
    (row: DashboardLender, columnId: string) => getLenderSortValue(row, columnId, commonT),
    [commonT],
  );

  return (
    <TableViewWidget
      config={config}
      rows={filteredLenders}
      columns={columns}
      emptyMessage={t('emptyData')}
      getSortValue={getSortValue}
      onRowClick={(row) => router.push(`/lenders/${row.id}`)}
    />
  );
}
