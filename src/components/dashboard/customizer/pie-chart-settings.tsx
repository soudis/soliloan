'use client';

import debounce from 'lodash.debounce';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { EntityFilterFieldPicker } from '@/components/dashboard/widgets/filters/entity-filter-field-picker';
import { NumericBucketEditor } from '@/components/dashboard/widgets/pie-chart/numeric-bucket-editor';
import { PieChartTextTransformFields } from '@/components/dashboard/widgets/pie-chart/pie-chart-text-transform-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildAllFilterFieldOptions, getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import {
  DEFAULT_PIE_CHART_TOP_N,
  PIE_CHART_DATE_GROUPINGS,
  PIE_CHART_MEASURES,
  PIE_CHART_MEASURES_WITHOUT_AVERAGE,
  type PieChartWidgetConfig,
} from '@/types/dashboard-widgets/pie-chart';

const CONFIG_COMMIT_DEBOUNCE_MS = 400;

function toFieldValue(entity: string, field: string): string {
  return `${entity}:${field}`;
}

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

  const flushConfig = useCallback(() => {
    debouncedCommit.flush();
  }, [debouncedCommit]);

  const fieldOptions = buildAllFilterFieldOptions(project, tLoans, tLenders, commonT);

  const groupByValue = toFieldValue(draftConfig.groupBy.entity, draftConfig.groupBy.field);
  const groupFieldDef = getFilterDefinitionForField(
    fieldOptions,
    draftConfig.groupBy.entity,
    draftConfig.groupBy.field,
  );

  const patchConfig = (patch: Partial<PieChartWidgetConfig>, immediate = false) => {
    commitConfig({ ...draftConfig, ...patch }, immediate);
  };

  const hideAverage = PIE_CHART_MEASURES_WITHOUT_AVERAGE.includes(draftConfig.measure);

  const effectiveAggregation =
    hideAverage && draftConfig.measureAggregation === 'average' ? 'sum' : draftConfig.measureAggregation;

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

      <div className="space-y-2">
        <Label className="text-xs">{t('groupBy')}</Label>
        <EntityFilterFieldPicker
          value={groupByValue}
          fieldOptions={fieldOptions}
          translationNamespace="dashboard.customizer.pieChart"
          placeholderKey="groupByPlaceholder"
          onChange={(entity, field) => {
            const def = getFilterDefinitionForField(fieldOptions, entity, field);
            const patch: Partial<PieChartWidgetConfig> = {
              groupBy: { entity, field },
              numericBuckets: undefined,
              dateGrouping: undefined,
              textTransform: undefined,
            };
            if (def?.type === 'number') {
              patch.numericBuckets = draftConfig.numericBuckets ?? [1000, 5000];
            } else if (def?.type === 'date') {
              patch.dateGrouping = 'year';
            }
            patchConfig(patch, true);
          }}
        />
      </div>

      {groupFieldDef?.type === 'number' ? (
        <NumericBucketEditor
          thresholds={draftConfig.numericBuckets ?? []}
          onChange={(numericBuckets) => patchConfig({ numericBuckets: numericBuckets.length ? numericBuckets : undefined })}
        />
      ) : null}

      {groupFieldDef?.type === 'date' ? (
        <div className="space-y-2">
          <Label className="text-xs">{t('dateGrouping')}</Label>
          <Select
            value={draftConfig.dateGrouping ?? 'year'}
            onValueChange={(v) =>
              patchConfig({ dateGrouping: v as PieChartWidgetConfig['dateGrouping'] }, true)
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIE_CHART_DATE_GROUPINGS.map((g) => (
                <SelectItem key={g} value={g}>
                  {t(`dateGroupingOptions.${g}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {groupFieldDef?.type === 'text' ? (
        <PieChartTextTransformFields
          value={draftConfig.textTransform}
          onChange={(textTransform) => patchConfig({ textTransform })}
        />
      ) : null}

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
            <SelectItem value="sum">{t('measureAggregationSum')}</SelectItem>
            <SelectItem value="count">{t('measureAggregationCount')}</SelectItem>
            {!hideAverage ? <SelectItem value="average">{t('measureAggregationAverage')}</SelectItem> : null}
          </SelectContent>
        </Select>
        {draftConfig.measure === 'loanCount' ? (
          <p className="text-xs text-muted-foreground">{t('loanCountMeasureHint')}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('topNCategories')}</Label>
        <Input
          type="number"
          min={1}
          max={50}
          step={1}
          className="h-8 text-xs"
          value={draftConfig.topNCategories}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            patchConfig({
              topNCategories: Number.isFinite(n) && n >= 1 && n <= 50 ? n : DEFAULT_PIE_CHART_TOP_N,
            });
          }}
          onBlur={flushConfig}
        />
      </div>

      <EntityFilterList
        filters={draftConfig.filters}
        fieldOptions={fieldOptions}
        onChange={(filters) => patchConfig({ filters })}
      />
    </div>
  );
}
