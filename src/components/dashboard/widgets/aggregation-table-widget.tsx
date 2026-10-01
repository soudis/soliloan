'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { WidgetResultUnavailable } from '@/components/dashboard/widgets/widget-result-unavailable';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useComputedWidgetResult } from '@/hooks/use-computed-widget-result';
import { sortAggregationTableRows } from '@/lib/dashboard/aggregation-table/compute-aggregation-table';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { getSignedMetricValueClassName } from '@/lib/dashboard/get-signed-metric-value-class-name';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import {
  AGGREGATION_TABLE_GROUP_SORT_ID,
  type AggregationTableSortDirection,
  parseAggregationTableConfig,
} from '@/types/dashboard-widgets/aggregation-table';

type HeaderSort = {
  widgetId: string;
  savedSortColumnId: string;
  savedSortDirection: AggregationTableSortDirection;
  columnId: string;
  direction: AggregationTableSortDirection;
};

export function AggregationTableWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.aggregationTable');
  const tMetrics = useTranslations('dashboard.customizer.historyTable');
  const tDuration = useTranslations('common.duration');
  const locale = useLocale();

  const config = useMemo(() => parseAggregationTableConfig(widget.config), [widget.config]);
  const computed = useComputedWidgetResult(widget);
  const result = computed?.type === 'aggregation_table' ? computed.result : { rows: [], totals: {} };

  const [headerSort, setHeaderSort] = useState<HeaderSort | null>(null);

  const activeSort =
    headerSort &&
    headerSort.widgetId === widget.id &&
    headerSort.savedSortColumnId === config.sortColumnId &&
    headerSort.savedSortDirection === config.sortDirection
      ? { columnId: headerSort.columnId, direction: headerSort.direction }
      : { columnId: config.sortColumnId, direction: config.sortDirection };

  const rows = useMemo(
    () => sortAggregationTableRows(result.rows, activeSort.columnId, activeSort.direction, locale),
    [result.rows, activeSort.columnId, activeSort.direction, locale],
  );

  const toggleSort = (columnId: string) => {
    const nextDirection: AggregationTableSortDirection =
      activeSort.columnId === columnId
        ? activeSort.direction === 'asc'
          ? 'desc'
          : 'asc'
        : columnId === AGGREGATION_TABLE_GROUP_SORT_ID
          ? 'asc'
          : 'desc';
    setHeaderSort({
      widgetId: widget.id,
      savedSortColumnId: config.sortColumnId,
      savedSortDirection: config.sortDirection,
      columnId,
      direction: nextDirection,
    });
  };

  if (!computed) {
    return <WidgetResultUnavailable />;
  }

  if (config.columns.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyColumns')}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyData')}</p>;
  }

  const columnTitle = (title: string, metric: string) => resolveMetricTitle(title, tMetrics(`metrics.${metric}`));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead
              label={t('groupColumn')}
              align="left"
              active={activeSort.columnId === AGGREGATION_TABLE_GROUP_SORT_ID}
              direction={activeSort.direction}
              onClick={() => toggleSort(AGGREGATION_TABLE_GROUP_SORT_ID)}
            />
            {config.columns.map((column) => (
              <SortableHead
                key={column.id}
                label={columnTitle(column.title, column.metric)}
                align="right"
                active={activeSort.columnId === column.id}
                direction={activeSort.direction}
                onClick={() => toggleSort(column.id)}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className="hover:bg-transparent">
              <TableCell className="px-3 py-2 font-medium">{row.label}</TableCell>
              {config.columns.map((column) => {
                const rawValue = row.values[column.id] ?? null;
                return (
                  <TableCell
                    key={column.id}
                    className={cn(
                      'px-3 py-2 text-right tabular-nums',
                      getSignedMetricValueClassName(rawValue, column.colorCodeSign),
                    )}
                  >
                    {formatDashboardMetricValue(
                      column.metric,
                      rawValue,
                      column.aggregation === 'delta',
                      (key, values) => tDuration(key, values),
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="border-t border-table-border bg-muted/40 font-medium text-foreground">
          <TableRow className="hover:bg-transparent">
            <TableCell className="px-3 py-2">{t('totalsRow')}</TableCell>
            {config.columns.map((column) => {
              const rawValue = result.totals[column.id] ?? null;
              return (
                <TableCell
                  key={column.id}
                  className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    getSignedMetricValueClassName(rawValue, column.colorCodeSign),
                  )}
                >
                  {formatDashboardMetricValue(column.metric, rawValue, column.aggregation === 'delta', (key, values) =>
                    tDuration(key, values),
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function SortableHead({
  label,
  align,
  active,
  direction,
  onClick,
}: {
  label: string;
  align: 'left' | 'right';
  active: boolean;
  direction: AggregationTableSortDirection;
  onClick: () => void;
}) {
  const t = useTranslations('dashboard.widgets.aggregationTable');

  return (
    <TableHead
      className={cn('h-10 px-3 py-2', align === 'right' && 'text-right')}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground',
          align === 'right' && 'w-full justify-end',
        )}
        aria-label={t('sortByColumn', { column: label })}
        onClick={onClick}
      >
        {label}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="size-3 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="size-3 shrink-0" aria-hidden />
          )
        ) : null}
      </button>
    </TableHead>
  );
}
