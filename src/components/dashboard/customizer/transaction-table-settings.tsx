'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { buildTransactionTableColumnMeta } from '@/lib/dashboard/table-widget/transaction-table-column-registry';
import { buildTransactionFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { TransactionTableWidgetConfig } from '@/types/dashboard-widgets/table-view';

import { TableViewSettingsShared } from './table-view-settings-shared';

export function TransactionTableSettings({
  config,
  onConfigChange,
}: {
  config: TransactionTableWidgetConfig;
  onConfigChange: (config: TransactionTableWidgetConfig) => void;
}) {
  const tTransactions = useTranslations('dashboard.transactions');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const { project } = useDashboardData();

  const columnMeta = useMemo(() => {
    return buildTransactionTableColumnMeta(project).map((meta) => {
      const labelSource = meta.useLendersTranslations ? tLenders : meta.useLoansTranslations ? tLoans : tTransactions;
      return {
        id: meta.id,
        label: meta.customLabel ?? (meta.labelKey ? labelSource(meta.labelKey) : meta.id),
      };
    });
  }, [project, tTransactions, tLoans, tLenders]);

  const fieldOptions = useMemo(
    () => buildTransactionFilterFieldOptions(project, tTransactions, tLoans, tLenders, commonT),
    [project, tTransactions, tLoans, tLenders, commonT],
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
