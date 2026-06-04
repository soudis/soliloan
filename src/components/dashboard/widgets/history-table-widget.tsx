'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { computeHistoryTable } from '@/lib/dashboard/history-table/compute-history-table';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { type HistoryTableMetric, parseHistoryTableConfig } from '@/types/dashboard-widgets/history-table';

export function HistoryTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.historyTable');
  const tMetrics = useTranslations('dashboard.customizer.historyTable');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const formatter = useFormatter();
  const { loans, toDate, project } = useDashboardData();

  const config = useMemo(() => parseHistoryTableConfig(widget.config), [widget.config]);

  const fieldOptions = useMemo(
    () => buildAllFilterFieldOptions(project, tLoans, tLenders, commonT),
    [project, tLoans, tLenders, commonT],
  );

  const metricByColumnId = useMemo(() => {
    const map = new Map<string, HistoryTableMetric>();
    for (const col of config.columns) {
      map.set(col.id, col.metric);
    }
    return map;
  }, [config.columns]);

  const result = useMemo(
    () =>
      computeHistoryTable(
        loans,
        config,
        toDate,
        fieldOptions,
        (year, month) => formatter.dateTime(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' }),
        (key, values) => commonT(key, values),
        t('untilNow'),
      ),
    [loans, config, toDate, fieldOptions, formatter, commonT, t],
  );

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
          <TableRow>
            <TableHead>{t('periodColumn')}</TableHead>
            {result.columns.map((col) => {
              const metric = metricByColumnId.get(col.id);
              const title = resolveMetricTitle(
                col.title,
                metric ? tMetrics(`metrics.${metric}`) : col.title,
              );
              return (
                <TableHead key={col.id} className="text-right">
                  <span className="inline-flex items-center gap-1">{`${title}${col.aggregation === 'delta' ? ' (Δ)' : ''}`}</span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.periods.map((period) => (
            <TableRow key={period.key}>
              <TableCell className="font-medium">{period.label}</TableCell>
              {result.columns.map((col) => (
                <TableCell key={col.id} className="text-right tabular-nums">
                  {formatDashboardMetricValue(
                    metricByColumnId.get(col.id),
                    result.cells[period.key]?.[col.id] ?? null,
                    col.aggregation === 'delta',
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
