'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { filterValueSegmentClass, type FilterFieldSize } from '@/components/filters/filter-field-group';
import { cn } from '@/lib/utils';
import { parseBooleanFilterValue, type BooleanFilterValue } from '@/types/boolean-filter-value';

export function BooleanFilter({
  value,
  onChange,
  size = 'default',
}: {
  value: unknown;
  onChange: (value: BooleanFilterValue) => void;
  size?: FilterFieldSize;
}) {
  const tCommon = useTranslations('common.ui');
  const parsed = useMemo(() => parseBooleanFilterValue(value), [value]);

  return (
    <select
      className={cn(
        filterValueSegmentClass(size),
        'w-full rounded-md border border-border bg-background px-3 py-1',
      )}
      value={parsed}
      onChange={(e) => onChange(e.target.value as BooleanFilterValue)}
    >
      <option value="">{tCommon('table.all')}</option>
      <option value="true">{tCommon('boolean.yes')}</option>
      <option value="false">{tCommon('boolean.no')}</option>
    </select>
  );
}
