'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelectTrigger, Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { StatDeltaRange, StatDeltaUnit } from '@/types/dashboard-widgets/stat-widget';

export function StatDeltaRangeInput({
  value,
  onChange,
  numberLabel,
  unitOptions,
  className,
}: {
  value: StatDeltaRange;
  onChange: (value: StatDeltaRange) => void;
  numberLabel: string;
  unitOptions: { value: StatDeltaUnit; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs">{numberLabel}</Label>
      <div className="flex">
        <Input
          type="number"
          min={1}
          step={1}
          value={value.amount}
          onChange={(e) => {
            const raw = e.target.value;
            onChange({
              ...value,
              amount: raw === '' ? 1 : Math.max(1, Number.parseInt(raw, 10) || 1),
            });
          }}
          className="h-8 flex-1 rounded-r-none border-r-0 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Select
          value={value.unit}
          onValueChange={(unit) => onChange({ ...value, unit: unit as StatDeltaUnit })}
        >
          <CustomSelectTrigger className="h-8 w-[100px] rounded-l-none text-xs">
            <SelectValue />
          </CustomSelectTrigger>
          <SelectContent>
            {unitOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
