'use client';

import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import { CHART_CUMULATIVE_ONLY_METRICS, CHART_SERIES_METRICS } from '@/types/dashboard-widgets/chart-series';
import {
  createDefaultLineChartSeries,
  LINE_CHART_DASH_STYLES,
  LINE_CHART_LINE_SHAPES,
  LINE_CHART_LINE_WIDTH_MAX,
  LINE_CHART_LINE_WIDTH_MIN,
  type LineChartSeriesConfig,
} from '@/types/dashboard-widgets/line-chart-series';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export function LineChartSeriesEditor({
  series,
  onChange,
  fieldOptions,
  hideDelta = false,
}: {
  series: LineChartSeriesConfig[];
  onChange: (series: LineChartSeriesConfig[], immediate?: boolean) => void;
  fieldOptions: EntityFilterFieldOption[];
  hideDelta?: boolean;
}) {
  const tBar = useTranslations('dashboard.customizer.barChart');
  const t = useTranslations('dashboard.customizer.lineChart');
  const tMetrics = useTranslations('dashboard.customizer.historyTable');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const updateSeries = (id: string, patch: Partial<LineChartSeriesConfig>, immediate = false) => {
    onChange(
      series.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      immediate,
    );
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
    const item = createDefaultLineChartSeries();
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
        <Label>{tBar('series')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSeries}>
          <Plus className="mr-1 h-3 w-3" />
          {tBar('addSeries')}
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
                aria-label={isExpanded ? tBar('collapseColumn') : tBar('expandColumn')}
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
                aria-label={tBar('removeColumn')}
                onClick={() => removeSeries(col.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {isExpanded ? (
              <div className="space-y-3 border-t p-3">
                <div className="space-y-2">
                  <Label className="text-xs">{tBar('metric')}</Label>
                  <Select
                    value={col.metric}
                    onValueChange={(v) => {
                      const metric = v as LineChartSeriesConfig['metric'];
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
                <div className="space-y-2">
                  <Label className="text-xs">{tBar('columnTitle')}</Label>
                  <Input
                    value={col.title}
                    placeholder={tBar('titlePlaceholder')}
                    onChange={(e) => updateSeries(col.id, { title: e.target.value })}
                  />
                </div>

                {!cumulativeOnly && !hideDelta ? (
                  <div className="space-y-2">
                    <Label className="text-xs">{tBar('aggregation')}</Label>
                    <Select
                      value={col.aggregation}
                      onValueChange={(v) =>
                        updateSeries(col.id, { aggregation: v as LineChartSeriesConfig['aggregation'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cumulative">{tBar('aggregationCumulative')}</SelectItem>
                        <SelectItem value="delta">{tBar('aggregationDelta')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <EntityFilterList
                  filters={col.filters}
                  fieldOptions={fieldOptions}
                  onChange={(filters) => updateSeries(col.id, { filters })}
                />

                <div className="space-y-3 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">{t('lineStyleSection')}</p>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`line-filled-${col.id}`}
                      checked={col.filled}
                      onCheckedChange={(checked) => updateSeries(col.id, { filled: checked === true }, true)}
                    />
                    <Label htmlFor={`line-filled-${col.id}`} className="text-xs font-normal">
                      {t('filled')}
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`line-points-${col.id}`}
                      checked={col.showPoints}
                      onCheckedChange={(checked) => updateSeries(col.id, { showPoints: checked === true }, true)}
                    />
                    <Label htmlFor={`line-points-${col.id}`} className="text-xs font-normal">
                      {t('showPoints')}
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('lineShape')}</Label>
                    <Select
                      value={col.lineShape}
                      onValueChange={(v) =>
                        updateSeries(col.id, { lineShape: v as LineChartSeriesConfig['lineShape'] }, true)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_CHART_LINE_SHAPES.map((shape) => (
                          <SelectItem key={shape} value={shape}>
                            {t(`lineShapeOptions.${shape}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('dashStyle')}</Label>
                    <Select
                      value={col.dashStyle}
                      onValueChange={(v) =>
                        updateSeries(col.id, { dashStyle: v as LineChartSeriesConfig['dashStyle'] }, true)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINE_CHART_DASH_STYLES.map((style) => (
                          <SelectItem key={style} value={style}>
                            {t(`dashStyleOptions.${style}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('lineWidth')}</Label>
                    <Input
                      type="number"
                      min={LINE_CHART_LINE_WIDTH_MIN}
                      max={LINE_CHART_LINE_WIDTH_MAX}
                      value={col.lineWidth}
                      onChange={(e) => {
                        const parsed = Number.parseInt(e.target.value, 10);
                        if (!Number.isFinite(parsed)) {
                          return;
                        }
                        updateSeries(
                          col.id,
                          {
                            lineWidth: Math.min(LINE_CHART_LINE_WIDTH_MAX, Math.max(LINE_CHART_LINE_WIDTH_MIN, parsed)),
                          },
                          true,
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
