'use client';

import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { ChartDiscriminatorFields } from '@/components/dashboard/customizer/chart/chart-discriminator-fields';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { chartDiscriminatorToFlatFields } from '@/types/dashboard-widgets/chart-discriminator';
import {
  getPieChartDiscriminator,
  PIE_CHART_MEASURES,
  PIE_CHART_MEASURES_WITHOUT_AVERAGE,
  PIE_CHART_MEASURES_WITHOUT_SUM,
  type PieChartWidgetConfig,
} from '@/types/dashboard-widgets/pie-chart';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function PieChartSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: PieChartWidgetConfig;
  onConfigChange: (config: PieChartWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.pieChart');
  const tHistory = useTranslations('dashboard.customizer.historyTable');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const { project } = useDashboardData();
  const [draftConfig, setDraftConfig] = useState(savedConfig);

  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  useEffect(() => {
    setDraftConfig(savedConfig);
  }, [savedConfig]);

  const debouncedCommit = useMemo(
    () =>
      debounce((next: PieChartWidgetConfig) => {
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
    (next: PieChartWidgetConfig, immediate = false) => {
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

  const fieldOptions = buildAllFilterFieldOptions(project, tLoans, tLenders, commonT);

  const patchConfig = (patch: Partial<PieChartWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const hideAverage = PIE_CHART_MEASURES_WITHOUT_AVERAGE.includes(draftConfig.measure);
  const hideSum = PIE_CHART_MEASURES_WITHOUT_SUM.includes(draftConfig.measure);

  const effectiveAggregation =
    hideAverage && draftConfig.measureAggregation === 'average'
      ? 'sum'
      : hideSum && draftConfig.measureAggregation === 'sum'
        ? 'average'
        : draftConfig.measureAggregation;

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label className="text-xs">{t('chartVariant')}</Label>
        <Select
          value={draftConfig.chartVariant}
          onValueChange={(v) => patchConfig({ chartVariant: v as PieChartWidgetConfig['chartVariant'] }, true)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pie">{t('chartVariantPie')}</SelectItem>
            <SelectItem value="donut">{t('chartVariantDonut')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ChartDiscriminatorFields
        value={getPieChartDiscriminator(draftConfig)}
        fieldOptions={fieldOptions}
        translationNamespace="dashboard.customizer.chartDiscriminator"
        onChange={(discriminator) => {
          patchConfig(chartDiscriminatorToFlatFields(discriminator));
        }}
      />

      <div className="space-y-2">
        <Label className="text-xs">{t('measure')}</Label>
        <Select
          value={draftConfig.measure}
          onValueChange={(v) => {
            const measure = v as PieChartWidgetConfig['measure'];
            const patch: Partial<PieChartWidgetConfig> = { measure };
            if (PIE_CHART_MEASURES_WITHOUT_AVERAGE.includes(measure) && draftConfig.measureAggregation === 'average') {
              patch.measureAggregation = 'sum';
            }
            if (PIE_CHART_MEASURES_WITHOUT_SUM.includes(measure) && draftConfig.measureAggregation === 'sum') {
              patch.measureAggregation = 'average';
            }
            patchConfig(patch, true);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIE_CHART_MEASURES.map((m) => (
              <SelectItem key={m} value={m}>
                {tHistory(`metrics.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('measureAggregation')}</Label>
        <Select
          value={effectiveAggregation}
          onValueChange={(v) =>
            patchConfig({ measureAggregation: v as PieChartWidgetConfig['measureAggregation'] }, true)
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!hideSum ? <SelectItem value="sum">{t('measureAggregationSum')}</SelectItem> : null}
            <SelectItem value="count">{t('measureAggregationCount')}</SelectItem>
            {!hideAverage ? <SelectItem value="average">{t('measureAggregationAverage')}</SelectItem> : null}
          </SelectContent>
        </Select>
        {draftConfig.measure === 'loanCount' ? (
          <p className="text-xs text-muted-foreground">{t('loanCountMeasureHint')}</p>
        ) : null}
      </div>
    </div>
  );
}
