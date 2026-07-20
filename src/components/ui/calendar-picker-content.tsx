'use client';

import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  formatDateInput,
  getDateFnsLocale,
  getMonthEndDate,
  getMonthStartDate,
  getNextMonthStartDate,
  getNextYearStartDate,
  getYearEndDate,
  getYearStartDate,
  parseDateInput,
  toUTCDate,
  cn,
} from '@/lib/utils';

interface CalendarPickerContentProps {
  value: Date | undefined;
  onChange: (value: Date | null) => void;
  onClose: () => void;
  open: boolean;
  calendarDisabled?: (date: Date) => boolean;
}

export function CalendarPickerContent({
  value,
  onChange,
  onClose,
  open,
  calendarDisabled,
}: CalendarPickerContentProps) {
  const locale = useLocale();
  const t = useTranslations('common.ui.calendar');
  const dateLocale = getDateFnsLocale(locale);

  const [month, setMonth] = useState<Date>(() => value ?? new Date());
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    setMonth(value ?? today);
    setInputValue(formatDateInput(value ?? today));
  }, [open, value]);

  const applyDate = (date: Date, close = false) => {
    const utcDate = toUTCDate(date);
    if (!utcDate) return;
    onChange(utcDate);
    setMonth(utcDate);
    setInputValue(formatDateInput(utcDate));
    if (close) onClose();
  };

  const presetBaseDate = value ?? new Date();

  const presetOptions = [
    { key: 'monthStart', date: getMonthStartDate(presetBaseDate) },
    { key: 'monthEnd', date: getMonthEndDate(presetBaseDate) },
    { key: 'nextMonth', date: getNextMonthStartDate(presetBaseDate) },
    { key: 'yearStart', date: getYearStartDate(presetBaseDate) },
    { key: 'yearEnd', date: getYearEndDate(presetBaseDate) },
    { key: 'nextYearStart', date: getNextYearStartDate(presetBaseDate) },
  ] as const;

  const handleInputChange = (nextValue: string) => {
    setInputValue(nextValue);
    const parsed = parseDateInput(nextValue);
    if (parsed) {
      applyDate(parsed);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (parseDateInput(inputValue)) {
        onClose();
      }
    }
  };

  return (
    <div className="w-fit">
      <Calendar
        mode="single"
        required
        selected={value}
        month={month}
        onMonthChange={setMonth}
        onSelect={(date) => {
          if (!date) return;
          applyDate(date, true);
        }}
        onDayClick={(_day, modifiers) => {
          if (modifiers.selected) {
            onClose();
          }
        }}
        autoFocus
        disabled={calendarDisabled}
        locale={dateLocale}
      />
      <div className="flex items-center gap-1.5 border-t px-3 py-2">
        <Input
          value={inputValue}
          placeholder={t('dateInputPlaceholder')}
          className="h-8 w-[6.75rem] shrink-0 px-2"
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <div
          className={cn(
            'ml-auto flex w-fit shrink-0 items-stretch [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
          )}
        >
          <Button type="button" variant="outline" size="sm" onClick={() => applyDate(new Date())}>
            {t('today')}
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="px-2.5" aria-label={t('moreOptions')}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {presetOptions.map((option) => (
                <DropdownMenuItem key={option.key} onClick={() => applyDate(option.date)}>
                  {t(option.key)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
