'use client';

import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { ChartDiscriminatorFields } from '@/components/dashboard/customizer/chart/chart-discriminator-fields';
import { ChartTimelineFields } from '@/components/dashboard/customizer/chart/chart-timeline-fields';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { LineChartWidgetConfig } from '@/types/dashboard-widgets/line-chart';

import { LineChartSeriesEditor } from './line-chart-series-editor';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function LineChartSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: LineChartWidgetConfig;
  onConfigChange: (config: LineChartWidgetConfig) => void;
}) {
  const t = useTranslations('dashboard.customizer.lineChart');
  const tBar = useTranslations('dashboard.customizer.barChart');
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
      debounce((next: LineChartWidgetConfig) => {
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
    (next: LineChartWidgetConfig, immediate = false) => {
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

  const patchConfig = (patch: Partial<LineChartWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const isDiscriminator = draftConfig.xAxisMode === 'discriminator';

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label className="text-xs">{tBar('xAxisMode')}</Label>
        <Select
          value={draftConfig.xAxisMode}
          onValueChange={(v) => patchConfig({ xAxisMode: v as LineChartWidgetConfig['xAxisMode'] }, true)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timeline">{tBar('xAxisTimeline')}</SelectItem>
            <SelectItem value="discriminator">{tBar('xAxisDiscriminator')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {draftConfig.xAxisMode === 'timeline' ? (
        <ChartTimelineFields
          value={draftConfig.timeline}
          onChange={(timeline) => patchConfig({ timeline })}
          onBlur={flushConfig}
          monthlyMaxPeriodCount={24}
        />
      ) : (
        <>
          <ChartDiscriminatorFields
            value={draftConfig.discriminator}
            fieldOptions={fieldOptions}
            onChange={(discriminator) => patchConfig({ discriminator })}
          />
          <p className="text-xs text-muted-foreground">{tBar('discriminatorSnapshotHint')}</p>
        </>
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          id="line-chart-begin-at-zero"
          checked={draftConfig.beginAtZero}
          onCheckedChange={(checked) => patchConfig({ beginAtZero: checked === true }, true)}
        />
        <div className="grid gap-0.5 leading-none">
          <Label htmlFor="line-chart-begin-at-zero" className="text-xs font-normal">
            {t('beginAtZero')}
          </Label>
          <p className="text-xs text-muted-foreground">{t('beginAtZeroHint')}</p>
        </div>
      </div>

      <LineChartSeriesEditor
        series={draftConfig.series}
        onChange={(series, immediate = false) => patchConfig({ series }, immediate)}
        fieldOptions={fieldOptions}
        hideDelta={isDiscriminator}
      />
    </div>
  );
}
