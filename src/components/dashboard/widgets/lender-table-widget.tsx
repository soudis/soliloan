'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { DashboardLender } from '@/actions/dashboard/get-dashboard-stats';
import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useComputedWidgetResult } from '@/hooks/use-computed-widget-result';
import { useRouter } from '@/i18n/navigation';
import {
  buildAllLenderTableColumns,
  getLenderSortValue,
} from '@/lib/dashboard/table-widget/lender-table-column-registry';
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
  const { project } = useDashboardData();

  const config = useMemo(() => parseLenderTableConfig(widget.config), [widget.config]);
  const computed = useComputedWidgetResult(widget);
  const filteredLenders = computed.type === 'lender_table_view' ? computed.rows : [];

  const columns = useMemo(
    () => buildAllLenderTableColumns<DashboardLender>(project, tLenders, tLoans, commonT, locale),
    [project, tLenders, tLoans, commonT, locale],
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
