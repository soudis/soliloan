'use client';

import { X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import {
  filterDateSegmentClass,
  type FilterFieldSize,
  type FilterFieldVariant,
} from '@/components/filters/filter-field-group';
import { Button } from '@/components/ui/button';
import { CalendarPickerContent } from '@/components/ui/calendar-picker-content';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDateLong, formatDateShort, formatIsoDate } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const formatDateValue = size === 'sm' || variant === 'stacked' ? formatDateShort : formatDateLong;
  const selectedDate = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <CalendarPickerContent
          open={open}
          value={selectedDate}
          onChange={(date) => onChange(date ? formatIsoDate(date) : undefined)}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
