'use client';

import { useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel } from '@/components/ui/form';

interface FormCheckboxProps {
  name: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function FormCheckbox({ name, label, hint, className }: FormCheckboxProps) {
  const form = useFormContext();

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-row items-start space-x-3 space-y-0 ${className || ''}`}>
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
          </FormControl>
          {label && (
            <div className="space-y-1 leading-none">
              <FormLabel className="text-sm font-medium cursor-pointer">{label}</FormLabel>
              {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
            </div>
          )}
        </FormItem>
      )}
    />
  );
}
