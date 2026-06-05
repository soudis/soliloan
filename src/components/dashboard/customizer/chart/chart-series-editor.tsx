'use client';

import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import {
  CHART_CUMULATIVE_ONLY_METRICS,
  CHART_SERIES_METRICS,
  createDefaultChartSeries,
  type ChartSeriesConfig,
} from '@/types/dashboard-widgets/chart-series';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export function ChartSeriesEditor({
  series,
  onChange,
  fieldOptions,
  hideDelta = false,
  columnsLabelKey = 'columns',
  addLabelKey = 'addColumn',
  translationNamespace = 'dashboard.customizer.historyTable',
  metricsTranslationNamespace,
}: {
  series: ChartSeriesConfig[];
  onChange: (series: ChartSeriesConfig[]) => void;
  fieldOptions: EntityFilterFieldOption[];
  hideDelta?: boolean;
  columnsLabelKey?: string;
  addLabelKey?: string;
  translationNamespace?: string;
  metricsTranslationNamespace?: string;
}) {
  const t = useTranslations(translationNamespace);
  const tMetrics = useTranslations(metricsTranslationNamespace ?? translationNamespace);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const updateSeries = (id: string, patch: Partial<ChartSeriesConfig>) => {
    onChange(series.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSeries = (id: string) => {
    onChange(series.filter((s) => s.id !== id));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addSeries = () => {
    const item = createDefaultChartSeries();
    onChange([...series, item]);
    setExpandedIds((prev) => new Set(prev).add(item.id));
  };

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t(columnsLabelKey)}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSeries}>
          <Plus className="mr-1 h-3 w-3" />
          {t(addLabelKey)}
        </Button>
      </div>

      {series.map((col) => {
        const isExpanded = expandedIds.has(col.id);
        const cumulativeOnly = CHART_CUMULATIVE_ONLY_METRICS.includes(col.metric);

        return (
          <div key={col.id} className="rounded-md border">
            <div className="flex items-center gap-1 p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={isExpanded ? t('collapseColumn') : t('expandColumn')}
                onClick={() => toggle(col.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {resolveMetricTitle(col.title, tMetrics(`metrics.${col.metric}`))}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t('removeColumn')}
                onClick={() => removeSeries(col.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {isExpanded ? (
              <div className="space-y-3 border-t p-3">
                <div className="space-y-2">
                  <Label className="text-xs">{t('columnTitle')}</Label>
                  <Input
                    value={col.title}
                    placeholder={t('titlePlaceholder')}
                    onChange={(e) => updateSeries(col.id, { title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('metric')}</Label>
                  <Select
                    value={col.metric}
                    onValueChange={(v) => {
                      const metric = v as ChartSeriesConfig['metric'];
                      const aggregation = CHART_CUMULATIVE_ONLY_METRICS.includes(metric)
                        ? 'cumulative'
                        : hideDelta
                          ? 'cumulative'
                          : col.aggregation;
                      updateSeries(col.id, { metric, aggregation });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_SERIES_METRICS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {tMetrics(`metrics.${m}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!cumulativeOnly && !hideDelta ? (
                  <div className="space-y-2">
                    <Label className="text-xs">{t('aggregation')}</Label>
                    <Select
                      value={col.aggregation}
                      onValueChange={(v) =>
                        updateSeries(col.id, { aggregation: v as ChartSeriesConfig['aggregation'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cumulative">{t('aggregationCumulative')}</SelectItem>
                        <SelectItem value="delta">{t('aggregationDelta')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <EntityFilterList
                  filters={col.filters}
                  fieldOptions={fieldOptions}
                  onChange={(filters) => updateSeries(col.id, { filters })}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
