'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { getSignedMetricValueClassName } from '@/lib/dashboard/get-signed-metric-value-class-name';
import { cn } from '@/lib/utils';
import { resolveStatDisplayTitle } from '@/lib/dashboard/resolve-stat-display-title';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { computeAllStatValues } from '@/lib/dashboard/stat-widget/compute-stat-value';
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
  const tDuration = useTranslations('common.duration');
  const commonT = useTranslations('common');
  const { loans, toDate, fieldOptions } = useDashboardData();

  const config = useMemo(() => parseStatWidgetConfig(widget.config), [widget.config]);

  const computed = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () =>
          computeAllStatValues(loans, config.stats, toDate, fieldOptions, (key, values) => commonT(key, values)),
      }),
    [config.stats, loans, toDate, fieldOptions, commonT, widget.id, widget.type],
  );

  if (config.stats.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyStats')}</p>;
  }

  const layoutClassName = config.layoutMode === 'grid' ? 'grid gap-x-3 gap-y-2' : 'flex flex-wrap items-end';
  const layoutStyle =
    config.layoutMode === 'grid'
      ? {
          gridTemplateColumns: `repeat(${config.gridColumns ?? DEFAULT_STAT_GRID_COLUMNS}, minmax(0, 1fr))`,
        }
      : undefined;

  return (
    <div className={layoutClassName} style={layoutStyle}>
      {computed.map(({ stat, value }, index) => {
        const prevDisplayType = index > 0 ? computed[index - 1].stat.displayType : undefined;

        return (
          <div
            key={stat.id}
            className={cn(
              'min-w-0',
              stat.displayType === 'main'
                ? config.layoutMode === 'grid'
                  ? 'py-1'
                  : 'mb-4 mr-6 last:mr-0'
                : config.layoutMode === 'grid'
                  ? 'py-0'
                  : cn('mb-1 mr-3 last:mr-0', prevDisplayType === 'main' && 'mt-1'),
            )}
          >
            <StatItemDisplay
              label={resolveStatDisplayTitle(stat, tMetrics(`metrics.${stat.metric}`), (key, values) =>
                tStatCustomizer(key, values),
              )}
              stat={stat}
              value={value}
              formattedValue={formatDashboardMetricValue(
                stat.metric,
                value,
                stat.aggregation === 'delta',
                (key, values) => tDuration(key, values),
              )}
            />
          </div>
        );
      })}
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
  const valueClassName = cn('tabular-nums', getSignedMetricValueClassName(value, stat.colorCodeSign));

  if (stat.displayType === 'main') {
    return (
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-bold tracking-tight', valueClassName)}>{formattedValue}</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-medium leading-tight', valueClassName)}>{formattedValue}</p>
    </div>
  );
}
