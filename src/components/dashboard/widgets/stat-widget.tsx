'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { getSignedMetricValueClassName } from '@/lib/dashboard/get-signed-metric-value-class-name';
import { cn } from '@/lib/utils';
import { resolveStatDisplayTitle } from '@/lib/dashboard/resolve-stat-display-title';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { computeStatValue } from '@/lib/dashboard/stat-widget/compute-stat-value';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { DashboardWidget } from '@/types/dashboard-layout';
import {
  DEFAULT_STAT_GRID_COLUMNS,
  parseStatWidgetConfig,
  type StatItemConfig,
} from '@/types/dashboard-widgets/stat-widget';

export function StatWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.stat');
  const tMetrics = useTranslations('dashboard.customizer.historyTable');
  const tStatCustomizer = useTranslations('dashboard.customizer.stat');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const { loans, toDate, project } = useDashboardData();

  const config = useMemo(() => parseStatWidgetConfig(widget.config), [widget.config]);

  const fieldOptions = useMemo(
    () => buildAllFilterFieldOptions(project, tLoans, tLenders, commonT),
    [project, tLoans, tLenders, commonT],
  );

  const computed = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () =>
          config.stats.map((stat) => ({
            stat,
            value: computeStatValue(loans, stat, toDate, fieldOptions, (key, values) =>
              commonT(key, values),
            ),
          })),
      }),
    [config.stats, loans, toDate, fieldOptions, commonT, widget.id, widget.type],
  );

  if (config.stats.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyStats')}</p>;
  }

  const layoutClassName =
    config.layoutMode === 'grid' ? 'grid gap-6' : 'flex flex-wrap gap-6';
  const layoutStyle =
    config.layoutMode === 'grid'
      ? {
          gridTemplateColumns: `repeat(${config.gridColumns ?? DEFAULT_STAT_GRID_COLUMNS}, minmax(0, 1fr))`,
        }
      : undefined;

  return (
    <div className={layoutClassName} style={layoutStyle}>
      {computed.map(({ stat, value }) => (
        <StatItemDisplay
          key={stat.id}
          label={resolveStatDisplayTitle(stat, tMetrics(`metrics.${stat.metric}`), (key, values) =>
            tStatCustomizer(key, values),
          )}
          stat={stat}
          value={value}
          formattedValue={formatDashboardMetricValue(stat.metric, value, stat.aggregation === 'delta')}
        />
      ))}
    </div>
  );
}

function StatItemDisplay({
  label,
  stat,
  value,
  formattedValue,
}: {
  label: string;
  stat: StatItemConfig;
  value: number | null;
  formattedValue: string;
}) {
  const valueClassName = cn(
    'tabular-nums',
    getSignedMetricValueClassName(value, stat.colorCodeSign),
  );

  if (stat.displayType === 'main') {
    return (
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-bold tracking-tight', valueClassName)}>{formattedValue}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-medium', valueClassName)}>{formattedValue}</p>
    </div>
  );
}
