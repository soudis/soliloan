'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { buildLenderFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { buildLenderTableColumnMeta } from '@/lib/dashboard/table-widget/lender-table-column-registry';
import type { LenderTableWidgetConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewSettingsShared } from './table-view-settings-shared';

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
  const { project } = useDashboardData();

  const columnMeta = useMemo(() => {
    return buildLenderTableColumnMeta(project).map((meta) => {
      const labelSource = meta.useLoansTranslations ? tLoans : tLenders;
      return {
        id: meta.id,
        label: meta.customLabel ?? (meta.labelKey ? labelSource(meta.labelKey) : meta.id),
      };
    });
  }, [project, tLenders, tLoans]);

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
