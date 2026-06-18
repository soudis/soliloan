'use client';

import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { ChartSeriesEditor } from '@/components/dashboard/customizer/chart/chart-series-editor';
import { ChartTimelineFields } from '@/components/dashboard/customizer/chart/chart-timeline-fields';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

export function HistoryTableSettings({
  config: savedConfig,
  onConfigChange,
}: {
  config: HistoryTableWidgetConfig;
  onConfigChange: (config: HistoryTableWidgetConfig) => void;
}) {
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
      debounce((next: HistoryTableWidgetConfig) => {
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
    (next: HistoryTableWidgetConfig, immediate = false) => {
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

  const patchConfig = (patch: Partial<HistoryTableWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  return (
    <div className="mt-6 space-y-4 border-t pt-4">
      <ChartTimelineFields
        value={{
          periodMode: draftConfig.periodMode,
          periodCount: draftConfig.periodCount,
        }}
        onChange={(timeline) =>
          patchConfig({
            periodMode: timeline.periodMode,
            periodCount: timeline.periodCount,
          })
        }
        onBlur={flushConfig}
        defaultMonthlyPeriodCount={12}
      />

      <ChartSeriesEditor
        series={draftConfig.columns}
        onChange={(columns) => patchConfig({ columns })}
        fieldOptions={fieldOptions}
        showColorCodeSign
        defaultAggregation="delta"
      />
    </div>
  );
}
