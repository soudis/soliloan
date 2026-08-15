'use client';

import { useTranslations } from 'next-intl';

import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { SetTableUrlState } from '@/lib/hooks/use-table-url-state';
import type { TransactionTableUrlState } from '@/lib/hooks/use-transaction-table-url-state';
import {
  TRANSACTION_TIME_RANGE_PRESETS,
  type TransactionTimeRangePreset,
} from '@/lib/transactions/transaction-time-range';
import { formatIsoDate } from '@/lib/utils';

interface TransactionTimeRangeControlProps {
  state: Pick<TransactionTableUrlState, 'txRange' | 'txRangeFrom' | 'txRangeTo' | 'includeInterest'>;
  setTableState: SetTableUrlState & ((update: Partial<TransactionTableUrlState>) => void);
}

const PRESET_LABEL_KEYS: Record<TransactionTimeRangePreset, string> = {
  last_30_days: 'timeRange.last30Days',
  last_6_months: 'timeRange.last6Months',
  last_12_months: 'timeRange.last12Months',
  this_month: 'timeRange.thisMonth',
  last_month: 'timeRange.lastMonth',
  this_year: 'timeRange.thisYear',
  last_year: 'timeRange.lastYear',
  all: 'timeRange.all',
  custom: 'timeRange.custom',
};

export function TransactionTimeRangeControl({ state, setTableState }: TransactionTimeRangeControlProps) {
  const t = useTranslations('dashboard.transactions');
  const commonT = useTranslations('common');

  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="flex items-center gap-2">
        <Label htmlFor="tx-range" className="text-sm text-muted-foreground whitespace-nowrap">
          {t('timeRange.label')}
        </Label>
        <Select value={state.txRange} onValueChange={(value) => setTableState({ txRange: value, pageIndex: 0 })}>
          <SelectTrigger id="tx-range" className="h-8 w-[180px] bg-background text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_TIME_RANGE_PRESETS.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {t(PRESET_LABEL_KEYS[preset])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.txRange === 'custom' && (
        <>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">{t('timeRange.dateFrom')}</Label>
            <DatePickerInput
              value={state.txRangeFrom || null}
              onChange={(date) => setTableState({ txRangeFrom: date ? formatIsoDate(date) : '', pageIndex: 0 })}
              placeholder={commonT('ui.additionalFields.selectDate')}
              className="h-8 w-[150px] shrink-0 bg-background text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">{t('timeRange.dateTo')}</Label>
            <DatePickerInput
              value={state.txRangeTo || null}
              onChange={(date) => setTableState({ txRangeTo: date ? formatIsoDate(date) : '', pageIndex: 0 })}
              placeholder={commonT('ui.additionalFields.selectDate')}
              className="h-8 w-[150px] shrink-0 bg-background text-sm"
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Switch
          id="include-interest"
          checked={state.includeInterest}
          onCheckedChange={(checked) => setTableState({ includeInterest: checked, pageIndex: 0 })}
        />
        <Label htmlFor="include-interest" className="text-sm whitespace-nowrap">
          {t('includeInterest')}
        </Label>
      </div>
    </div>
  );
}
