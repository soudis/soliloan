'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COLUMN_GROUP_KEYS_IN_ORDER } from '@/lib/table-column-groups';
import { cn } from '@/lib/utils';
import type { ColumnGroupKey } from '@/components/ui/data-table';
import type { EntityFilterEntity, EntityFilterFieldOption } from '@/types/entity-filters';

function toFieldValue(entity: string, field: string): string {
  return `${entity}:${field}`;
}

function parseFieldValue(value: string): { entity: EntityFilterEntity; field: string } {
  const separator = value.indexOf(':');
  return {
    entity: value.slice(0, separator) as EntityFilterEntity,
    field: value.slice(separator + 1),
  };
}

export function EntityFilterFieldPicker({
  value,
  fieldOptions,
  onChange,
  className,
  translationNamespace = 'dashboard.customizer.historyTable',
  placeholderKey = 'filterField',
  size = 'xs',
}: {
  value: string;
  fieldOptions: EntityFilterFieldOption[];
  onChange: (entity: EntityFilterEntity, field: string) => void;
  className?: string;
  translationNamespace?: string;
  placeholderKey?: string;
  size?: 'xs' | 'sm';
}) {
  const t = useTranslations(translationNamespace);
  const tColumnGroups = useTranslations('dataTable.columnGroups');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => fieldOptions.find((opt) => toFieldValue(opt.entity, opt.field) === value),
    [fieldOptions, value],
  );

  const groupedOptions = useMemo(() => {
    const byGroup = new Map<ColumnGroupKey, EntityFilterFieldOption[]>();
    const ungrouped: EntityFilterFieldOption[] = [];

    for (const opt of fieldOptions) {
      const key = opt.columnGroup?.key;
      if (!key) {
        ungrouped.push(opt);
        continue;
      }
      const existing = byGroup.get(key) ?? [];
      existing.push(opt);
      byGroup.set(key, existing);
    }

    return {
      ungrouped,
      groups: COLUMN_GROUP_KEYS_IN_ORDER.filter((key) => (byGroup.get(key)?.length ?? 0) > 0).map((key) => ({
        id: key,
        options: byGroup.get(key) ?? [],
      })),
    };
  }, [fieldOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            size === 'sm' ? 'h-9 px-3 text-sm' : 'h-8 px-2 text-xs',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? t(placeholderKey)}</span>
          <ChevronsUpDown
            className={cn('ml-1 shrink-0 opacity-50', size === 'sm' ? 'h-4 w-4' : 'h-3.5 w-3.5')}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={tCommon('ui.actions.search')}
            className={size === 'sm' ? 'h-9 text-sm' : 'h-8 text-xs'}
          />
          <CommandList className="max-h-[min(280px,50dvh)]">
            <CommandEmpty>{tCommon('ui.actions.noResults')}</CommandEmpty>
            {groupedOptions.ungrouped.length > 0 ? (
              <CommandGroup>
                {groupedOptions.ungrouped.map((opt) => {
                  const itemValue = toFieldValue(opt.entity, opt.field);
                  return (
                    <CommandItem
                      key={itemValue}
                      value={`${opt.label} ${opt.field}`}
                      className={cn('cursor-pointer', size === 'sm' ? 'text-sm' : 'text-xs')}
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
            ) : null}
            {groupedOptions.groups.map((group) => (
              <CommandGroup key={group.id} heading={tColumnGroups(group.id)}>
                {group.options.map((opt) => {
                  const itemValue = toFieldValue(opt.entity, opt.field);
                  return (
                    <CommandItem
                      key={itemValue}
                      value={`${opt.label} ${opt.field} ${tColumnGroups(group.id)}`}
                      className={cn('cursor-pointer', size === 'sm' ? 'text-sm' : 'text-xs')}
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
