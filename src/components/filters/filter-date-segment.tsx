'use client';

import { de, enUS } from 'date-fns/locale';
import { X } from 'lucide-react';
import { useLocale } from 'next-intl';

import {
  filterDateSegmentClass,
  type FilterFieldSize,
  type FilterFieldVariant,
} from '@/components/filters/filter-field-group';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDateLong, formatDateShort } from '@/lib/utils';

function toIsoDateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

export function FilterDateSegment({
  label,
  value,
  onChange,
  onClear,
  variant,
  size = 'default',
  className,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | undefined) => void;
  onClear: () => void;
  variant: FilterFieldVariant;
  size?: FilterFieldSize;
  className?: string;
}) {
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const formatDateValue = size === 'sm' || variant === 'stacked' ? formatDateShort : formatDateLong;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          className={cn(filterDateSegmentClass(variant, size), !value && 'text-muted-foreground', className)}
        >
          {value ? (
            <div className="flex min-w-0 w-full items-center justify-between gap-1">
              <span className="truncate">{formatDateValue(value, locale)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => onChange(date ? toIsoDateString(date) : undefined)}
          initialFocus
          locale={dateLocale}
        />
      </PopoverContent>
    </Popover>
  );
}
