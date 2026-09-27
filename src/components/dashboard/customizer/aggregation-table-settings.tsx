'use client';

import debounce from 'lodash.debounce';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { StatDeltaRangeInput } from '@/components/dashboard/widgets/stat-delta-range-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import {
  AGGREGATION_TABLE_GROUP_SORT_ID,
  type AggregationTableColumnConfig,
  type AggregationTableSortDirection,
  type AggregationTableWidgetConfig,
  aggregationDiscriminatorToConfigFields,
  createDefaultAggregationTableColumn,
  getAggregationTableDiscriminator,
  resolveAggregationTableSortColumnId,
} from '@/types/dashboard-widgets/aggregation-table';
import {
  CUMULATIVE_ONLY_STAT_METRICS,
  createDefaultStatDeltaRange,
  normalizeStatAggregation,
  STAT_DELTA_UNITS,
  STAT_METRICS_AVG_MEDIAN_ONLY,
  STAT_METRICS_TOTAL_ONLY,
  STAT_WIDGET_METRICS,
  type StatAggregation,
  type StatWidgetMetric,
  supportsStatByLenderAggregation,
} from '@/types/dashboard-widgets/stat-widget';

import { ChartDiscriminatorFields } from './chart/chart-discriminator-fields';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function AggregationTableSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: AggregationTableWidgetConfig;
  onConfigChange: (config: AggregationTableWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.aggregationTable');
  const tStat = useTranslations('dashboard.customizer.stat');
  const tHistory = useTranslations('dashboard.customizer.historyTable');
  const tWidget = useTranslations('dashboard.widgets.aggregationTable');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const { project } = useDashboardData();
  const [draftConfig, setDraftConfig] = useState(savedConfig);
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set());

  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  useEffect(() => {
    setDraftConfig(savedConfig);
  }, [savedConfig]);

  const debouncedCommit = useMemo(
    () =>
      debounce((next: AggregationTableWidgetConfig) => {
        onConfigChangeRef.current(next);
      }, CONFIG_COMMIT_DEBOUNCE_MS),
    [],
  );

  useEffect(
    () => () => {
      debouncedCommit.flush();
      debouncedCommit.cancel();
    },
    [debouncedCommit],
  );

  const commitConfig = useCallback(
    (next: AggregationTableWidgetConfig, immediate = false) => {
      setDraftConfig(next);
      if (immediate) {
        debouncedCommit.cancel();
        onConfigChangeRef.current(next);
      } else {
        debouncedCommit(next);
      }
    },
    [debouncedCommit],
  );

  const flushConfig = useCallback(() => {
    debouncedCommit.flush();
  }, [debouncedCommit]);

  const fieldOptions = buildAllFilterFieldOptions(project, tLoans, tLenders, commonT);

  const deltaUnitOptions = useMemo(
    () =>
      STAT_DELTA_UNITS.map((unit) => ({
        value: unit,
        label: tStat(`deltaUnits.${unit}`),
      })),
    [tStat],
  );

  const patchConfig = (patch: Partial<AggregationTableWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const metricLabel = useCallback((metric: StatWidgetMetric) => tHistory(`metrics.${metric}`), [tHistory]);

  const aggregationLabel = useCallback(
    (aggregation: StatAggregation) => {
      switch (aggregation) {
        case 'average':
          return tStat('aggregationAverage');
        case 'median':
          return tStat('aggregationMedian');
        case 'averageByLender':
          return tStat('aggregationAverageByLender');
        case 'medianByLender':
          return tStat('aggregationMedianByLender');
        case 'delta':
          return tStat('aggregationDelta');
        default:
          return tStat('aggregationTotal');
      }
    },
    [tStat],
  );

  const updateColumn = (id: string, patch: Partial<AggregationTableColumnConfig>, immediate = false) => {
    patchConfig(
      {
        columns: draftConfig.columns.map((column) => (column.id === id ? { ...column, ...patch } : column)),
      },
      immediate,
    );
  };

  const removeColumn = (id: string) => {
    const columns = draftConfig.columns.filter((column) => column.id !== id);
    patchConfig(
      {
        columns,
        sortColumnId: resolveAggregationTableSortColumnId(
          draftConfig.sortColumnId === id ? undefined : draftConfig.sortColumnId,
          columns,
        ),
      },
      true,
    );
    setExpandedColumnIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addColumn = () => {
    const column = createDefaultAggregationTableColumn();
    patchConfig(
      {
        columns: [...draftConfig.columns, column],
        sortColumnId: draftConfig.columns.length === 0 ? column.id : draftConfig.sortColumnId,
      },
      true,
    );
    setExpandedColumnIds((prev) => new Set(prev).add(column.id));
  };

  const toggleColumn = (id: string) => {
    setExpandedColumnIds((prev) => {
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
    <div className="mt-6 space-y-4 border-t pt-4">
      <ChartDiscriminatorFields
        value={getAggregationTableDiscriminator(draftConfig)}
        fieldOptions={fieldOptions}
        translationNamespace="dashboard.customizer.chartDiscriminator"
        showTopN={false}
        onChange={(discriminator) => {
          patchConfig(aggregationDiscriminatorToConfigFields(discriminator));
        }}
      />

      <div className="flex items-center justify-between">
        <Label>{t('columns')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="mr-1 h-3 w-3" />
          {t('addColumn')}
        </Button>
      </div>

      {draftConfig.columns.map((column) => {
        const isExpanded = expandedColumnIds.has(column.id);
        const cumulativeOnly = CUMULATIVE_ONLY_STAT_METRICS.includes(column.metric);
        const totalOnly = STAT_METRICS_TOTAL_ONLY.includes(column.metric);
        const avgMedOnly = STAT_METRICS_AVG_MEDIAN_ONLY.includes(column.metric);
        const supportsByLender = supportsStatByLenderAggregation(column.metric);
        const title = resolveMetricTitle(column.title, metricLabel(column.metric));

        return (
          <div key={column.id} className="rounded-md border">
            <div className="flex items-center gap-1 p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={isExpanded ? t('collapseColumn') : t('expandColumn')}
                onClick={() => toggleColumn(column.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {title}
                <span className="font-normal text-muted-foreground"> · {aggregationLabel(column.aggregation)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t('removeColumn')}
                onClick={() => removeColumn(column.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {isExpanded ? (
              <div className="space-y-3 border-t p-3">
                <div className="space-y-2">
                  <Label className="text-xs">{tStat('metric')}</Label>
                  <Select
                    value={column.metric}
                    onValueChange={(v) => {
                      const metric = v as StatWidgetMetric;
                      const aggregation = normalizeStatAggregation(metric, column.aggregation);
                      updateColumn(
                        column.id,
                        {
                          metric,
                          aggregation,
                          deltaRange:
                            aggregation === 'delta' ? (column.deltaRange ?? createDefaultStatDeltaRange()) : undefined,
                        },
                        true,
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAT_WIDGET_METRICS.map((metric) => (
                        <SelectItem key={metric} value={metric}>
                          {metricLabel(metric)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('columnTitle')}</Label>
                  <Input
                    value={column.title}
                    placeholder={tHistory('titlePlaceholder')}
                    onChange={(e) => updateColumn(column.id, { title: e.target.value })}
                    onBlur={flushConfig}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{tStat('aggregation')}</Label>
                  <Select
                    value={column.aggregation}
                    onValueChange={(v) => {
                      const aggregation = v as StatAggregation;
                      updateColumn(
                        column.id,
                        {
                          aggregation,
                          deltaRange:
                            aggregation === 'delta' ? (column.deltaRange ?? createDefaultStatDeltaRange()) : undefined,
                        },
                        true,
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!avgMedOnly ? <SelectItem value="total">{tStat('aggregationTotal')}</SelectItem> : null}
                      {!totalOnly ? (
                        <>
                          <SelectItem value="average">{tStat('aggregationAverage')}</SelectItem>
                          <SelectItem value="median">{tStat('aggregationMedian')}</SelectItem>
                        </>
                      ) : null}
                      {supportsByLender ? (
                        <>
                          <SelectItem value="averageByLender">{tStat('aggregationAverageByLender')}</SelectItem>
                          <SelectItem value="medianByLender">{tStat('aggregationMedianByLender')}</SelectItem>
                        </>
                      ) : null}
                      {!cumulativeOnly && !avgMedOnly && !totalOnly ? (
                        <SelectItem value="delta">{tStat('aggregationDelta')}</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
                {column.aggregation === 'delta' ? (
                  <StatDeltaRangeInput
                    value={column.deltaRange ?? createDefaultStatDeltaRange()}
                    onChange={(deltaRange) => updateColumn(column.id, { deltaRange })}
                    numberLabel={tStat('deltaRange')}
                    unitOptions={deltaUnitOptions}
                  />
                ) : null}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`aggregation-color-code-sign-${column.id}`}
                    checked={column.colorCodeSign === true}
                    onCheckedChange={(checked) => updateColumn(column.id, { colorCodeSign: checked === true })}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={`aggregation-color-code-sign-${column.id}`} className="text-xs font-normal">
                      {tStat('colorCodeSign')}
                    </Label>
                    <p className="text-xs text-muted-foreground">{tStat('colorCodeSignHint')}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="space-y-2">
        <Label className="text-xs">{t('sortColumn')}</Label>
        <Select value={draftConfig.sortColumnId} onValueChange={(sortColumnId) => patchConfig({ sortColumnId }, true)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AGGREGATION_TABLE_GROUP_SORT_ID}>{tWidget('groupColumn')}</SelectItem>
            {draftConfig.columns.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {resolveMetricTitle(column.title, metricLabel(column.metric))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('sortDirection')}</Label>
        <Select
          value={draftConfig.sortDirection}
          onValueChange={(sortDirection) =>
            patchConfig({ sortDirection: sortDirection as AggregationTableSortDirection }, true)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">{t('sortAsc')}</SelectItem>
            <SelectItem value="desc">{t('sortDesc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
