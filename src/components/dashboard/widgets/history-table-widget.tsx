'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { WidgetResultUnavailable } from '@/components/dashboard/widgets/widget-result-unavailable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useComputedWidgetResult } from '@/hooks/use-computed-widget-result';
import { Link } from '@/i18n/navigation';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { getSignedMetricValueClassName } from '@/lib/dashboard/get-signed-metric-value-class-name';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import { useProjectId } from '@/lib/hooks/use-project-id';
import { buildTransactionsTableHrefForHistoryPeriod } from '@/lib/transactions/build-transactions-table-link';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseHistoryTableConfig } from '@/types/dashboard-widgets/history-table';

export function HistoryTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.historyTable');
  const tMetrics = useTranslations('dashboard.customizer.historyTable');
  const projectId = useProjectId();

  const config = useMemo(() => parseHistoryTableConfig(widget.config), [widget.config]);
  const computed = useComputedWidgetResult(widget);
  const result = computed?.type === 'history_table' ? computed.result : { periods: [], columns: [], cells: {} };

  const columnById = useMemo(() => {
    const map = new Map(config.columns.map((col) => [col.id, col]));
    return map;
  }, [config.columns]);

  if (!computed) {
    return <WidgetResultUnavailable />;
  }

  if (config.columns.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyColumns')}</p>;
  }

  if (result.periods.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyPeriods')}</p>;
  }

  const hasData = result.periods.some((period) =>
    config.columns.some((col) => {
      const v = result.cells[period.key]?.[col.id];
      return v !== null && v !== undefined;
    }),
  );

  if (!hasData) {
    return <p className="text-sm text-muted-foreground">{t('emptyData')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 px-3 py-2">{t('periodColumn')}</TableHead>
            {result.columns.map((col) => {
              const columnConfig = columnById.get(col.id);
              const metric = columnConfig?.metric;
              const title = resolveMetricTitle(col.title, metric ? tMetrics(`metrics.${metric}`) : col.title);
              return (
                <TableHead key={col.id} className="h-10 px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1">{title}</span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.periods.map((period) => (
            <TableRow key={period.key} className="hover:bg-transparent">
              <TableCell className="px-3 py-2 font-medium">
                <Link
                  href={buildTransactionsTableHrefForHistoryPeriod({
                    periodStart: new Date(period.periodStart),
                    periodEnd: new Date(period.periodEnd),
                    projectId,
                  })}
                  className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                  title={t('periodLinkTitle', { period: period.label })}
                >
                  {period.label}
                </Link>
              </TableCell>
              {result.columns.map((col) => {
                const rawValue = result.cells[period.key]?.[col.id] ?? null;
                const columnConfig = columnById.get(col.id);
                return (
                  <TableCell
                    key={col.id}
                    className={cn(
                      'px-3 py-2 text-right tabular-nums',
                      getSignedMetricValueClassName(rawValue, columnConfig?.colorCodeSign),
                    )}
                  >
                    {formatDashboardMetricValue(columnConfig?.metric, rawValue, col.aggregation === 'delta')}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
