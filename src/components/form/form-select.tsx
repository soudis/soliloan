import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField as FormFieldWrapper,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';

type SelectOption =
  | {
      value: string;
      label: string;
      disabled?: boolean;
    }
  | 'divider';

interface FormSelectProps {
  name: string;
  label?: string;
  placeholder: string;
  options: SelectOption[];
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  position?: 'popper' | 'item-aligned';
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  customContent?: () => ReactNode;
  clearable?: boolean;
}

export function FormSelect({
  name,
  label,
  placeholder,
  options,
  disabled = false,
  hint,
  position = 'popper',
  side = 'bottom',
  align = 'start',
  customContent,
  clearable = false,
}: FormSelectProps) {
  const t = useTranslations('common');
  const form = useFormContext();
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <div className="relative">
            <Select
              disabled={disabled}
              onValueChange={(value) => field.onChange(value === 'clear' ? '' : value)}
              value={field.value || undefined}
            >
              <FormControl>
                <SelectTrigger className={field.value ? '' : 'text-muted-foreground/60'}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent position={position} side={side} align={align} className="max-h-[300px]">
                {clearable && (
                  <SelectItem value="clear">
                    <span className="text-muted-foreground/60">{placeholder ?? t('clear')}</span>
                  </SelectItem>
                )}
                {customContent
                  ? customContent()
                  : options.map((option, index) =>
                      option === 'divider' ? (
                        <SelectSeparator
                          key={`divider_${
                            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                            index
                          }`}
                        />
                      ) : (
                        <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                          {option.label}
                        </SelectItem>
                      ),
                    )}
              </SelectContent>
            </Select>
            {clearable && field.value && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={(e) => {
                  e.preventDefault();
                  field.onChange('clear');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <FormMessage />
          {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
