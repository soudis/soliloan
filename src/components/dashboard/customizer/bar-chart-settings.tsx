'use client';

import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { ChartDiscriminatorFields } from '@/components/dashboard/customizer/chart/chart-discriminator-fields';
import { ChartSeriesEditor } from '@/components/dashboard/customizer/chart/chart-series-editor';
import { ChartTimelineFields } from '@/components/dashboard/customizer/chart/chart-timeline-fields';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { BarChartWidgetConfig } from '@/types/dashboard-widgets/bar-chart';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function BarChartSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: BarChartWidgetConfig;
  onConfigChange: (config: BarChartWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.barChart');
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
      debounce((next: BarChartWidgetConfig) => {
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
    (next: BarChartWidgetConfig, immediate = false) => {
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

  const patchConfig = (patch: Partial<BarChartWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const isDiscriminator = draftConfig.xAxisMode === 'discriminator';

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label className="text-xs">{t('xAxisMode')}</Label>
        <Select
          value={draftConfig.xAxisMode}
          onValueChange={(v) => patchConfig({ xAxisMode: v as BarChartWidgetConfig['xAxisMode'] }, true)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timeline">{t('xAxisTimeline')}</SelectItem>
            <SelectItem value="discriminator">{t('xAxisDiscriminator')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {draftConfig.xAxisMode === 'timeline' ? (
        <ChartTimelineFields
          value={draftConfig.timeline}
          onChange={(timeline) => patchConfig({ timeline })}
          onBlur={flushConfig}
        />
      ) : (
        <>
          <ChartDiscriminatorFields
            value={draftConfig.discriminator}
            fieldOptions={fieldOptions}
            onChange={(discriminator) => patchConfig({ discriminator })}
          />
          <p className="text-xs text-muted-foreground">{t('discriminatorSnapshotHint')}</p>
        </>
      )}

      <div className="space-y-2">
        <Label className="text-xs">{t('seriesLayout')}</Label>
        <Select
          value={draftConfig.seriesLayout}
          onValueChange={(v) => patchConfig({ seriesLayout: v as BarChartWidgetConfig['seriesLayout'] }, true)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grouped">{t('seriesLayoutGrouped')}</SelectItem>
            <SelectItem value="stacked">{t('seriesLayoutStacked')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ChartSeriesEditor
        series={draftConfig.series}
        onChange={(series) => patchConfig({ series })}
        fieldOptions={fieldOptions}
        hideDelta={isDiscriminator}
        translationNamespace="dashboard.customizer.barChart"
        metricsTranslationNamespace="dashboard.customizer.historyTable"
        columnsLabelKey="series"
        addLabelKey="addSeries"
      />
    </div>
  );
}
