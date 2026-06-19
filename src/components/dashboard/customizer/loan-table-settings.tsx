'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { buildLoanTableColumnMeta } from '@/lib/dashboard/table-widget/loan-table-column-registry';
import { buildLoanFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { LoanTableWidgetConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewSettingsShared } from './table-view-settings-shared';

export function LoanTableSettings({
  config,
  onConfigChange,
}: {
  config: LoanTableWidgetConfig;
  onConfigChange: (config: LoanTableWidgetConfig) => void;
}) {
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const { project } = useDashboardData();

  const columnMeta = useMemo(() => {
    return buildLoanTableColumnMeta(project).map((meta) => {
      const labelSource = meta.useLendersTranslations ? tLenders : tLoans;
      return {
        id: meta.id,
        label: meta.customLabel ?? (meta.labelKey ? labelSource(meta.labelKey) : meta.id),
      };
    });
  }, [project, tLoans, tLenders]);

  const fieldOptions = useMemo(() => buildLoanFilterFieldOptions(project, tLoans, commonT), [project, tLoans, commonT]);

  return (
    <TableViewSettingsShared
      config={config}
      onConfigChange={onConfigChange}
      columnMeta={columnMeta}
      fieldOptions={fieldOptions}
    />
  );
}
