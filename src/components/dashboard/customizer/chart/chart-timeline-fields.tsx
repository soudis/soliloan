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
  monthlyMaxPeriodCount,
  defaultMonthlyPeriodCount,
}: {
  value: BarChartTimelineConfig;
  onChange: (next: BarChartTimelineConfig) => void;
  onBlur?: () => void;
  translationNamespace?: string;
  monthlyMaxPeriodCount?: number;
  defaultMonthlyPeriodCount?: number;
}) {
  const t = useTranslations(translationNamespace);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('periodMode')}</Label>
        <Select
          value={value.periodMode}
          onValueChange={(v) => {
            const periodMode = v as BarChartTimelineConfig['periodMode'];
            if (periodMode === value.periodMode) {
              return;
            }
            const next: BarChartTimelineConfig = { ...value, periodMode };
            if (periodMode === 'monthly' && defaultMonthlyPeriodCount != null) {
              next.periodCount = defaultMonthlyPeriodCount;
            }
            onChange(next);
          }}
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
        <Label>{value.periodMode === 'monthly' ? t('periodCountMonthly') : t('periodCountYearly')}</Label>
        <Input
          type="number"
          min={1}
          max={value.periodMode === 'monthly' ? monthlyMaxPeriodCount : undefined}
          placeholder={
            value.periodMode === 'monthly' ? t('periodCountPlaceholderMonthly') : t('periodCountPlaceholderYearly')
          }
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
        {value.periodMode === 'monthly' && monthlyMaxPeriodCount != null ? (
          <p className="text-xs text-muted-foreground">{t('periodCountHint', { max: monthlyMaxPeriodCount })}</p>
        ) : null}
      </div>
    </div>
  );
}
