'use client';

import { useFormContext } from 'react-hook-form';

import { FormControl, FormDescription, FormField as FormFieldWrapper, FormItem, FormLabel } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Switch } from '../ui/switch';

interface FormSwitchProps {
  name: string;
  label?: string;
  hint?: string;
  className?: string;
  labelPlacement?: 'top' | 'inline';
  /** Persist checked state as 'true'/'false' strings (additional fields). */
  stringValue?: boolean;
}

export function FormSwitch({
  name,
  label,
  hint,
  className,
  labelPlacement = 'top',
  stringValue = false,
}: FormSwitchProps) {
  const form = useFormContext();

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className={cn(labelPlacement === 'inline' && 'flex items-center justify-between gap-4')}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <Switch
                checked={field.value === true || field.value === 'true'}
                onCheckedChange={(checked) => field.onChange(stringValue ? (checked ? 'true' : 'false') : checked)}
                className={cn(labelPlacement === 'top' && 'mt-2')}
              />
            </FormControl>
          </div>
          {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
