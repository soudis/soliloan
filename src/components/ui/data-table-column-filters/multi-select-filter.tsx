import type { ColumnFilter } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MultiSelectFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: string[]) => void;
  options: { label: string; value: string }[];
}

export function MultiSelectFilter({ filterState, options, onFilterChange }: MultiSelectFilterProps) {
  const t = useTranslations('common.ui');
  const value = (filterState?.value as string[] | undefined) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-between">
          <span className="truncate">
            {value.length === 0
              ? t('form.selectPlaceholder')
              : value.length === 1
                ? options.find((o) => o.value === value[0])?.label
                : `${value.length} ausgewählt`}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={checked}
              onCheckedChange={(nextChecked) => {
                const next = nextChecked === true ? [...value, option.value] : value.filter((v) => v !== option.value);
                onFilterChange(next);
              }}
              onSelect={(e) => e.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
