'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

const FILTER_GROUPS = [
  { id: 'loan' as const, labelKey: 'filterGroupLoan' },
  { id: 'lender' as const, labelKey: 'filterGroupLender' },
];

function toFieldValue(entity: string, field: string): string {
  return `${entity}:${field}`;
}

function parseFieldValue(value: string): { entity: 'loan' | 'lender'; field: string } {
  const separator = value.indexOf(':');
  return {
    entity: value.slice(0, separator) as 'loan' | 'lender',
    field: value.slice(separator + 1),
  };
}

export function EntityFilterFieldPicker({
  value,
  fieldOptions,
  onChange,
  className,
}: {
  value: string;
  fieldOptions: EntityFilterFieldOption[];
  onChange: (entity: 'loan' | 'lender', field: string) => void;
  className?: string;
}) {
  const t = useTranslations('dashboard.customizer.historyTable');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => fieldOptions.find((opt) => toFieldValue(opt.entity, opt.field) === value),
    [fieldOptions, value],
  );

  const groupedOptions = useMemo(
    () =>
      FILTER_GROUPS.map((group) => ({
        ...group,
        options: fieldOptions.filter((opt) => opt.group === group.id),
      })).filter((group) => group.options.length > 0),
    [fieldOptions],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-8 w-full justify-between px-2 text-xs font-normal', className)}
        >
          <span className="truncate">{selected?.label ?? t('filterField')}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={tCommon('ui.actions.search')} className="h-8 text-xs" />
          <CommandList className="max-h-[min(280px,50dvh)]">
            <CommandEmpty>{tCommon('ui.actions.noResults')}</CommandEmpty>
            {groupedOptions.map((group) => (
              <CommandGroup key={group.id} heading={t(group.labelKey)}>
                {group.options.map((opt) => {
                  const itemValue = toFieldValue(opt.entity, opt.field);
                  return (
                    <CommandItem
                      key={itemValue}
                      value={`${opt.label} ${opt.field}`}
                      className="cursor-pointer text-xs"
                      onSelect={() => {
                        const parsed = parseFieldValue(itemValue);
                        onChange(parsed.entity, parsed.field);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn('mr-2 h-3.5 w-3.5 shrink-0', value === itemValue ? 'opacity-100' : 'opacity-0')}
                      />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
