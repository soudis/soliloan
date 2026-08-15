'use client';

import { useFormContext } from 'react-hook-form';

import { DatePickerInput } from '@/components/ui/date-picker-input';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FormDatePickerProps {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function FormDatePicker({ name, label, placeholder = 'Pick a date', disabled, className }: FormDatePickerProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          {label && <FormLabel>{label}</FormLabel>}
          <DatePickerInput
            withFormControl
            value={field.value}
            onChange={(date) => field.onChange(date ?? '')}
            placeholder={placeholder}
            calendarDisabled={disabled}
            className={className}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
