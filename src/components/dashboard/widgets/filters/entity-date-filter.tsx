'use client';

import { de, enUS } from 'date-fns/locale';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { StatDeltaRangeInput } from '@/components/dashboard/widgets/stat-delta-range-input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDateShort } from '@/lib/utils';
import { STAT_DELTA_UNITS } from '@/types/dashboard-widgets/stat-widget';
import {
  createDefaultEntityDateFilterValue,
  createDefaultRelativeEntityDateFilterValue,
  type EntityDateFilterMode,
  type EntityDateFilterValue,
  parseEntityDateFilterValue,
} from '@/types/entity-date-filter';

function toIsoDateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function FixedDateButton({
  label,
  value,
  onChange,
  onClear,
  dateLocale,
  locale,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | undefined) => void;
  onClear: () => void;
  dateLocale: typeof de;
  locale: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 w-full justify-start px-2 text-left text-xs font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          {value ? (
            <div className="flex min-w-0 items-center justify-between gap-1 w-full">
              <span className="truncate">{formatDateShort(value, locale)}</span>
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

export function EntityDateFilter({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: EntityDateFilterValue) => void;
}) {
  const t = useTranslations('dashboard.customizer.historyTable');
  const tStat = useTranslations('dashboard.customizer.stat');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  const parsed = useMemo(() => parseEntityDateFilterValue(value), [value]);

  const unitOptions = useMemo(
    () =>
      STAT_DELTA_UNITS.map((unit) => ({
        value: unit,
        label: tStat(`deltaUnits.${unit}`),
      })),
    [tStat],
  );

  const setMode = (mode: EntityDateFilterMode) => {
    if (mode === parsed.mode) {
      return;
    }
    onChange(mode === 'relative' ? createDefaultRelativeEntityDateFilterValue() : createDefaultEntityDateFilterValue());
  };

  if (parsed.mode === 'relative') {
    return (
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">{t('dateFilterMode')}</Label>
          <Select value="relative" onValueChange={(mode) => setMode(mode as EntityDateFilterMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">{t('dateFilterModeFixed')}</SelectItem>
              <SelectItem value="relative">{t('dateFilterModeRelative')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <StatDeltaRangeInput
          value={{ amount: parsed.amount, unit: parsed.unit }}
          onChange={(next) => onChange({ mode: 'relative', amount: next.amount, unit: next.unit })}
          numberLabel={t('dateFilterRelative')}
          unitOptions={unitOptions}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">{t('dateFilterMode')}</Label>
        <Select value="fixed" onValueChange={(mode) => setMode(mode as EntityDateFilterMode)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">{t('dateFilterModeFixed')}</SelectItem>
            <SelectItem value="relative">{t('dateFilterModeRelative')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <FixedDateButton
          label={t('dateFilterStart')}
          value={parsed.start}
          locale={locale}
          dateLocale={dateLocale}
          onChange={(start) =>
            onChange({
              mode: 'fixed',
              start: start ?? null,
              end: parsed.end,
            })
          }
          onClear={() =>
            onChange({
              mode: 'fixed',
              start: null,
              end: parsed.end,
            })
          }
        />
        <span className="text-xs text-muted-foreground">{t('dateFilterTo')}</span>
        <FixedDateButton
          label={t('dateFilterEnd')}
          value={parsed.end}
          locale={locale}
          dateLocale={dateLocale}
          onChange={(end) =>
            onChange({
              mode: 'fixed',
              start: parsed.start,
              end: end ?? null,
            })
          }
          onClear={() =>
            onChange({
              mode: 'fixed',
              start: parsed.start,
              end: null,
            })
          }
        />
      </div>
    </div>
  );
}
