'use client';

import debounce from 'lodash.debounce';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { StatDeltaRangeInput } from '@/components/dashboard/widgets/stat-delta-range-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveStatDisplayTitle } from '@/lib/dashboard/resolve-stat-display-title';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import {
  CUMULATIVE_ONLY_STAT_METRICS,
  createDefaultStatDeltaRange,
  DEFAULT_STAT_GRID_COLUMNS,
  normalizeStatAggregation,
  STAT_DELTA_UNITS,
  STAT_GRID_COLUMNS_MAX,
  STAT_GRID_COLUMNS_MIN,
  STAT_METRICS_AVG_MEDIAN_ONLY,
  STAT_METRICS_TOTAL_ONLY,
  STAT_ONLY_METRICS,
  STAT_WIDGET_METRICS,
  supportsStatByLenderAggregation,
  type StatItemConfig,
  type StatWidgetConfig,
} from '@/types/dashboard-widgets/stat-widget';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function StatWidgetSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: StatWidgetConfig;
  onConfigChange: (config: StatWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.stat');
  const tHistory = useTranslations('dashboard.customizer.historyTable');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const { project } = useDashboardData();
  const [draftConfig, setDraftConfig] = useState(savedConfig);
  const [expandedStatIds, setExpandedStatIds] = useState<Set<string>>(() => new Set());

  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  useEffect(() => {
    setDraftConfig(savedConfig);
  }, [savedConfig]);

  const debouncedCommit = useMemo(
    () =>
      debounce((next: StatWidgetConfig) => {
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
    (next: StatWidgetConfig, immediate = false) => {
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
        label: t(`deltaUnits.${unit}`),
      })),
    [t],
  );

  const patchConfig = (patch: Partial<StatWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const updateStat = (id: string, patch: Partial<StatItemConfig>, immediate = false) => {
    patchConfig(
      {
        stats: draftConfig.stats.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
      immediate,
    );
  };

  const removeStat = (id: string) => {
    patchConfig({ stats: draftConfig.stats.filter((s) => s.id !== id) }, true);
    setExpandedStatIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addStat = () => {
    const id = crypto.randomUUID();
    patchConfig(
      {
        stats: [
          ...draftConfig.stats,
          {
            id,
            title: '',
            displayType: 'main',
            metric: 'balance',
            aggregation: 'total',
            colorCodeSign: false,
            filters: [],
          },
        ],
      },
      true,
    );
    setExpandedStatIds((prev) => new Set(prev).add(id));
  };

  const toggleStat = (id: string) => {
    setExpandedStatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const metricLabel = useCallback(
    (metric: StatItemConfig['metric']) => {
      if ((STAT_ONLY_METRICS as readonly string[]).includes(metric)) {
        return t(`metrics.${metric}`);
      }
      return tHistory(`metrics.${metric}`);
    },
    [t, tHistory],
  );

  const layoutMode = draftConfig.layoutMode ?? 'flexible';

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label className="text-xs">{t('layoutMode')}</Label>
        <Select
          value={layoutMode}
          onValueChange={(v) => {
            const mode = v as StatWidgetConfig['layoutMode'];
            patchConfig(
              {
                layoutMode: mode,
                gridColumns: mode === 'grid' ? (draftConfig.gridColumns ?? DEFAULT_STAT_GRID_COLUMNS) : undefined,
              },
              true,
            );
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flexible">{t('layoutModeFlexible')}</SelectItem>
            <SelectItem value="grid">{t('layoutModeGrid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {layoutMode === 'grid' ? (
        <div className="space-y-2">
          <Label className="text-xs">{t('gridColumns')}</Label>
          <Input
            type="number"
            min={STAT_GRID_COLUMNS_MIN}
            max={STAT_GRID_COLUMNS_MAX}
            className="h-8 text-xs"
            value={draftConfig.gridColumns ?? DEFAULT_STAT_GRID_COLUMNS}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (!Number.isFinite(parsed)) {
                return;
              }
              patchConfig({
                gridColumns: Math.min(STAT_GRID_COLUMNS_MAX, Math.max(STAT_GRID_COLUMNS_MIN, parsed)),
              });
            }}
            onBlur={flushConfig}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Label>{t('stats')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addStat}>
          <Plus className="mr-1 h-3 w-3" />
          {t('addStat')}
        </Button>
      </div>

      {draftConfig.stats.map((stat) => {
        const isExpanded = expandedStatIds.has(stat.id);
        const cumulativeOnly = CUMULATIVE_ONLY_STAT_METRICS.includes(stat.metric);
        const totalOnly = STAT_METRICS_TOTAL_ONLY.includes(stat.metric);
        const avgMedOnly = STAT_METRICS_AVG_MEDIAN_ONLY.includes(stat.metric);
        const supportsByLender = supportsStatByLenderAggregation(stat.metric);

        return (
          <div key={stat.id} className="rounded-md border">
            <div className="flex items-center gap-1 p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={isExpanded ? t('collapseStat') : t('expandStat')}
                onClick={() => toggleStat(stat.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {resolveStatDisplayTitle(stat, metricLabel(stat.metric), (key, values) => t(key, values))}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t('removeStat')}
                onClick={() => removeStat(stat.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {isExpanded ? (
              <div className="space-y-3 border-t p-3">
                <div className="space-y-2">
                  <Label className="text-xs">{t('metric')}</Label>
                  <Select
                    value={stat.metric}
                    onValueChange={(v) => {
                      const metric = v as StatItemConfig['metric'];
                      const aggregation = normalizeStatAggregation(metric, stat.aggregation);
                      const patch: Partial<StatItemConfig> = {
                        metric,
                        aggregation,
                        deltaRange:
                          aggregation === 'delta' ? (stat.deltaRange ?? createDefaultStatDeltaRange()) : undefined,
                      };
                      updateStat(stat.id, patch, true);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAT_WIDGET_METRICS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {metricLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('statTitle')}</Label>
                  <Input
                    value={stat.title}
                    placeholder={tHistory('titlePlaceholder')}
                    onChange={(e) => updateStat(stat.id, { title: e.target.value })}
                    onBlur={flushConfig}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('displayType')}</Label>
                  <Select
                    value={stat.displayType}
                    onValueChange={(v) =>
                      updateStat(stat.id, { displayType: v as StatItemConfig['displayType'] }, true)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">{t('displayTypeMain')}</SelectItem>
                      <SelectItem value="secondary">{t('displayTypeSecondary')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t('aggregation')}</Label>
                  <Select
                    value={stat.aggregation}
                    onValueChange={(v) => {
                      const aggregation = v as StatItemConfig['aggregation'];
                      updateStat(
                        stat.id,
                        {
                          aggregation,
                          deltaRange:
                            aggregation === 'delta' ? (stat.deltaRange ?? createDefaultStatDeltaRange()) : undefined,
                        },
                        true,
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!avgMedOnly ? <SelectItem value="total">{t('aggregationTotal')}</SelectItem> : null}
                      {!totalOnly ? (
                        <>
                          <SelectItem value="average">{t('aggregationAverage')}</SelectItem>
                          <SelectItem value="median">{t('aggregationMedian')}</SelectItem>
                        </>
                      ) : null}
                      {supportsByLender ? (
                        <>
                          <SelectItem value="averageByLender">{t('aggregationAverageByLender')}</SelectItem>
                          <SelectItem value="medianByLender">{t('aggregationMedianByLender')}</SelectItem>
                        </>
                      ) : null}
                      {!cumulativeOnly && !avgMedOnly && !totalOnly ? (
                        <SelectItem value="delta">{t('aggregationDelta')}</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
                {stat.aggregation === 'delta' ? (
                  <StatDeltaRangeInput
                    value={stat.deltaRange ?? createDefaultStatDeltaRange()}
                    onChange={(deltaRange) => updateStat(stat.id, { deltaRange })}
                    numberLabel={t('deltaRange')}
                    unitOptions={deltaUnitOptions}
                  />
                ) : null}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`stat-color-code-sign-${stat.id}`}
                    checked={stat.colorCodeSign === true}
                    onCheckedChange={(checked) => updateStat(stat.id, { colorCodeSign: checked === true })}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={`stat-color-code-sign-${stat.id}`} className="text-xs font-normal">
                      {t('colorCodeSign')}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t('colorCodeSignHint')}</p>
                  </div>
                </div>
                <EntityFilterList
                  filters={stat.filters}
                  fieldOptions={fieldOptions}
                  onChange={(filters) => updateStat(stat.id, { filters })}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
