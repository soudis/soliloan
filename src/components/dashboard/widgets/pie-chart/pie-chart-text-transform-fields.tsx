'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PieChartTextTransform } from '@/types/dashboard-widgets/pie-chart';

export function PieChartTextTransformFields({
  value,
  onChange,
}: {
  value: PieChartTextTransform | undefined;
  onChange: (value: PieChartTextTransform | undefined) => void;
}) {
  const t = useTranslations('dashboard.customizer.pieChart');

  const kind = value?.kind ?? 'none';

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t('textTransform')}</Label>
      <Select
        value={kind}
        onValueChange={(v) => {
          if (v === 'none') {
            onChange(undefined);
            return;
          }
          if (v === 'firstWord' || v === 'charCount') {
            onChange({ kind: v });
            return;
          }
          onChange({ kind: v as 'firstChars' | 'lastChars', count: value?.kind === v ? (value as { count: number }).count : 3 });
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{t('textTransformNone')}</SelectItem>
          <SelectItem value="firstChars">{t('textTransformFirstChars')}</SelectItem>
          <SelectItem value="lastChars">{t('textTransformLastChars')}</SelectItem>
          <SelectItem value="firstWord">{t('textTransformFirstWord')}</SelectItem>
          <SelectItem value="charCount">{t('textTransformCharCount')}</SelectItem>
        </SelectContent>
      </Select>
      {kind === 'firstChars' || kind === 'lastChars' ? (
        <div className="space-y-1">
          <Label className="text-xs">{t('textTransformCount')}</Label>
          <Input
            type="number"
            min={1}
            step={1}
            className="h-8 text-xs"
            value={value?.kind === kind ? value.count : 3}
            onChange={(e) => {
              const count = Math.max(1, Number.parseInt(e.target.value, 10) || 1);
              onChange({ kind, count });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
