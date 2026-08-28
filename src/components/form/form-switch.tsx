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
}

export function FormSwitch({ name, label, hint, className, labelPlacement = 'top' }: FormSwitchProps) {
  const form = useFormContext();

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className={cn(labelPlacement === 'inline' && 'flex items-center gap-2')}>
            {labelPlacement === 'inline' ? (
              <>
                <FormControl>
                  <Switch checked={field.value && field.value !== 'false'} onCheckedChange={field.onChange} />
                </FormControl>
                {label && <FormLabel className="cursor-pointer">{label}</FormLabel>}
              </>
            ) : (
              <>
                {label && <FormLabel>{label}</FormLabel>}
                <FormControl>
                  <Switch
                    checked={field.value && field.value !== 'false'}
                    onCheckedChange={field.onChange}
                    className="mt-2"
                  />
                </FormControl>
              </>
            )}
          </div>
          {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
