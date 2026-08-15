'use client';

import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormControl } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDateLong, getDateFnsLocale, toUTCDate } from '@/lib/utils';

interface DatePickerInputProps {
  value: Date | string | '' | null | undefined;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  calendarDisabled?: (date: Date) => boolean;
  withFormControl?: boolean;
  className?: string;
}

const hasDateValue = (value: Date | string | '' | null | undefined): value is Date | string => {
  if (value == null || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime());
};

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  calendarDisabled,
  withFormControl = false,
  className,
}: DatePickerInputProps) {
  const locale = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (disabled && next) return;
    (onOpenChangeProp ?? setInternalOpen)(next);
  };

  const selectedDate = hasDateValue(value) ? (value instanceof Date ? value : new Date(value)) : undefined;

  const trigger = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn('w-full pl-3 text-left font-normal', !hasDateValue(value) && 'text-muted-foreground', className)}
    >
      {hasDateValue(value) ? formatDateLong(value, locale) : <span>{placeholder}</span>}
      <div className="ml-auto flex items-center gap-1">
        {hasDateValue(value) && !disabled && (
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded-sm opacity-50 hover:bg-accent hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </div>
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{withFormControl ? <FormControl>{trigger}</FormControl> : trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(toUTCDate(date));
            handleOpenChange(false);
          }}
          autoFocus
          disabled={calendarDisabled}
          locale={dateLocale}
        />
      </PopoverContent>
    </Popover>
  );
}
