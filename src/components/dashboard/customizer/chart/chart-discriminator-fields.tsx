'use client';

import { useTranslations } from 'next-intl';

import { EntityFilterList } from '@/components/dashboard/widgets/filters/entity-filter-list';
import { EntityFilterFieldPicker } from '@/components/dashboard/widgets/filters/entity-filter-field-picker';
import { NumericBucketEditor } from '@/components/dashboard/widgets/pie-chart/numeric-bucket-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import {
  CHART_DATE_GROUPINGS,
  DEFAULT_CHART_TOP_N,
  type ChartDiscriminatorConfig,
} from '@/types/dashboard-widgets/chart-discriminator';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { ChartTextTransformFields } from './chart-text-transform-fields';

function toFieldValue(entity: string, field: string): string {
  return `${entity}:${field}`;
}

export function ChartDiscriminatorFields({
  value,
  onChange,
  fieldOptions,
  translationNamespace = 'dashboard.customizer.chartDiscriminator',
  showTopN = true,
}: {
  value: ChartDiscriminatorConfig;
  onChange: (next: ChartDiscriminatorConfig) => void;
  fieldOptions: EntityFilterFieldOption[];
  translationNamespace?: string;
  showTopN?: boolean;
}) {
  const t = useTranslations(translationNamespace);

  const groupByValue = toFieldValue(value.groupBy.entity, value.groupBy.field);
  const groupFieldDef = getFilterDefinitionForField(fieldOptions, value.groupBy.entity, value.groupBy.field);

  const patch = (partial: Partial<ChartDiscriminatorConfig>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">{t('groupBy')}</Label>
        <EntityFilterFieldPicker
          value={groupByValue}
          fieldOptions={fieldOptions}
          translationNamespace={translationNamespace}
          placeholderKey="groupByPlaceholder"
          onChange={(entity, field) => {
            if (entity === 'transaction') {
              return;
            }
            const def = getFilterDefinitionForField(fieldOptions, entity, field);
            const next: ChartDiscriminatorConfig = {
              ...value,
              groupBy: { entity, field },
              numericBuckets: undefined,
              dateGrouping: undefined,
              textTransform: undefined,
            };
            if (def?.type === 'number') {
              next.numericBuckets = value.numericBuckets ?? [1000, 5000];
            } else if (def?.type === 'date') {
              next.dateGrouping = 'year';
            }
            onChange(next);
          }}
        />
      </div>

      {groupFieldDef?.type === 'number' ? (
        <NumericBucketEditor
          thresholds={value.numericBuckets ?? []}
          onChange={(numericBuckets) => patch({ numericBuckets: numericBuckets.length ? numericBuckets : undefined })}
          translationNamespace={translationNamespace}
        />
      ) : null}

      {groupFieldDef?.type === 'date' ? (
        <div className="space-y-2">
          <Label className="text-xs">{t('dateGrouping')}</Label>
          <Select
            value={value.dateGrouping ?? 'year'}
            onValueChange={(v) => patch({ dateGrouping: v as ChartDiscriminatorConfig['dateGrouping'] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_DATE_GROUPINGS.map((g) => (
                <SelectItem key={g} value={g}>
                  {t(`dateGroupingOptions.${g}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {groupFieldDef?.type === 'text' ? (
        <ChartTextTransformFields
          value={value.textTransform}
          onChange={(textTransform) => patch({ textTransform })}
          translationNamespace={translationNamespace}
        />
      ) : null}

      {showTopN ? (
        <div className="space-y-2">
          <Label className="text-xs">{t('topNCategories')}</Label>
          <Input
            type="number"
            min={1}
            max={50}
            step={1}
            className="h-8 text-xs"
            value={value.topNCategories}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              patch({
                topNCategories: Number.isFinite(n) && n >= 1 && n <= 50 ? n : DEFAULT_CHART_TOP_N,
              });
            }}
          />
        </div>
      ) : null}

      <EntityFilterList
        filters={value.filters}
        fieldOptions={fieldOptions}
        onChange={(filters) => patch({ filters })}
      />
    </div>
  );
}
