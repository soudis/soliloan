'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { buildLenderFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { buildLenderTableColumnMeta } from '@/lib/dashboard/table-widget/lender-table-column-registry';
import type { LenderTableWidgetConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewSettingsShared } from './table-view-settings-shared';

const LENDER_AGGREGATE_COLUMN_IDS = new Set([
  'amount',
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interest',
  'interestPaid',
]);

export function LenderTableSettings({
  config,
  onConfigChange,
}: {
  config: LenderTableWidgetConfig;
  onConfigChange: (config: LenderTableWidgetConfig) => void;
}) {
  const tLenders = useTranslations('dashboard.lenders');
  const tLoans = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { project } = useDashboardData();

  const columnMeta = useMemo(() => {
    return buildLenderTableColumnMeta(project, tLenders, tLoans, commonT, locale).map((meta) => {
      const labelSource = LENDER_AGGREGATE_COLUMN_IDS.has(meta.id) ? tLoans : tLenders;
      return {
        id: meta.id,
        label: meta.customLabel ?? (meta.labelKey ? labelSource(meta.labelKey) : meta.id),
      };
    });
  }, [project, tLenders, tLoans, commonT, locale]);

  const fieldOptions = useMemo(
    () => buildLenderFilterFieldOptions(project, tLenders, tLoans, commonT),
    [project, tLenders, tLoans, commonT],
  );

  return (
    <TableViewSettingsShared
      config={config}
      onConfigChange={onConfigChange}
      columnMeta={columnMeta}
      fieldOptions={fieldOptions}
    />
  );
}
