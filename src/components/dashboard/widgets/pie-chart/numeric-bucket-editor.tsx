'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function NumericBucketEditor({
  thresholds,
  onChange,
}: {
  thresholds: number[];
  onChange: (thresholds: number[]) => void;
}) {
  const t = useTranslations('dashboard.customizer.pieChart');

  const updateThreshold = (index: number, raw: string) => {
    const parsed = Number.parseFloat(raw.replace(',', '.'));
    const next = [...thresholds];
    if (raw === '' || !Number.isFinite(parsed)) {
      next.splice(index, 1);
    } else {
      next[index] = parsed;
    }
    onChange(next.filter((n) => Number.isFinite(n)).sort((a, b) => a - b));
  };

  const addThreshold = () => {
    const last = thresholds[thresholds.length - 1];
    onChange([...thresholds, Number.isFinite(last) ? last * 2 || 1000 : 1000].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{t('numericBuckets')}</Label>
      <p className="text-xs text-muted-foreground">{t('numericBucketsHint')}</p>
      {thresholds.map((value, index) => (
        <div key={`bucket-${index}`} className="flex items-center gap-2">
          <Input
            type="number"
            step="any"
            value={value}
            onChange={(e) => updateThreshold(index, e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={t('removeBucket')}
            onClick={() => onChange(thresholds.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addThreshold}>
        <Plus className="mr-1 h-3 w-3" />
        {t('addBucket')}
      </Button>
    </div>
  );
}
