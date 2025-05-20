'use client';

import { useFormContext } from 'react-hook-form';

import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '../ui/switch';

interface FormSwitchProps {
  name: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function FormSwitch({ name, label, hint, className }: FormSwitchProps) {
  const form = useFormContext();

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Switch
              checked={field.value && field.value !== 'false'}
              onCheckedChange={field.onChange}
              className="mt-2"
            />
          </FormControl>
          {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
