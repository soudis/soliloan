'use client';

import { useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface FormCheckboxProps {
  name: string;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
}

export function FormCheckbox({ name, label, hint, className, disabled }: FormCheckboxProps) {
  const form = useFormContext();

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('space-y-2', className)}>
          <div className="flex items-start gap-2.5">
            <FormControl>
              <Checkbox
                className="mt-0.5"
                checked={field.value === true}
                disabled={disabled}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            {label ? (
              <FormLabel className="text-sm font-normal leading-snug cursor-pointer pt-0.5 peer-disabled:cursor-not-allowed">
                {label}
              </FormLabel>
            ) : null}
          </div>
          {hint ? (
            <FormDescription className={cn('text-sm text-muted-foreground/80', label ? 'ps-7' : undefined)}>
              {hint}
            </FormDescription>
          ) : null}
        </FormItem>
      )}
    />
  );
}
