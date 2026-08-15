'use client';

import { DateFilterWithOperator } from '@/components/filters/date-filter-with-operator';
import type { DateFilterValue } from '@/types/date-filter-value';

export function EntityDateFilter({
  value,
  onChange,
  allowEmpty = false,
  referenceDate,
}: {
  value: unknown;
  onChange: (value: DateFilterValue) => void;
  allowEmpty?: boolean;
  referenceDate?: Date;
}) {
  return (
    <DateFilterWithOperator
      value={value}
      onChange={onChange}
      allowEmpty={allowEmpty}
      referenceDate={referenceDate}
      translationNamespace="dashboard.customizer.historyTable"
      variant="stacked"
      size="sm"
    />
  );
}
