import type { ColumnFilter } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

interface SelectFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: string) => void;
  options: { label: string; value: string }[];
}

export function SelectFilter({ filterState, options, onFilterChange }: SelectFilterProps) {
  const t = useTranslations('common.ui');
  return (
    <select
      className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
      value={(filterState?.value as string) ?? ''}
      onChange={(e) => onFilterChange(e.target.value)}
    >
      <option value="">{t('table.all')}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
