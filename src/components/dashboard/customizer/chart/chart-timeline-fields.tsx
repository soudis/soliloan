'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BarChartTimelineConfig } from '@/types/dashboard-widgets/bar-chart';

export function ChartTimelineFields({
  value,
  onChange,
  onBlur,
  translationNamespace = 'dashboard.customizer.historyTable',
}: {
  value: BarChartTimelineConfig;
  onChange: (next: BarChartTimelineConfig) => void;
  onBlur?: () => void;
  translationNamespace?: string;
}) {
  const t = useTranslations(translationNamespace);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('periodMode')}</Label>
        <Select
          value={value.periodMode}
          onValueChange={(v) =>
            onChange({ ...value, periodMode: v as BarChartTimelineConfig['periodMode'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yearly">{t('periodModeYearly')}</SelectItem>
            <SelectItem value="monthly">{t('periodModeMonthly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('periodCount')}</Label>
        <Input
          type="number"
          min={1}
          max={value.periodMode === 'monthly' ? 24 : undefined}
          placeholder={t('periodCountPlaceholder')}
          value={value.periodCount ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            onChange({
              ...value,
              periodCount: raw === '' ? null : Number(raw),
            });
          }}
          onBlur={onBlur}
        />
        {value.periodMode === 'monthly' ? (
          <p className="text-xs text-muted-foreground">{t('periodCountHint')}</p>
        ) : null}
      </div>
    </div>
  );
}
