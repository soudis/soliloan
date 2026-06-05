'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { buildLoanFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { buildLoanTableColumnMeta } from '@/lib/dashboard/table-widget/loan-table-column-registry';
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
  const commonT = useTranslations('common');
  const { project } = useDashboardData();

  const columnMeta = useMemo(() => {
    return buildLoanTableColumnMeta(project).map((meta) => ({
      id: meta.id,
      label: meta.customLabel ?? (meta.labelKey ? tLoans(meta.labelKey) : meta.id),
    }));
  }, [project, tLoans]);

  const fieldOptions = useMemo(
    () => buildLoanFilterFieldOptions(project, tLoans, commonT),
    [project, tLoans, commonT],
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
