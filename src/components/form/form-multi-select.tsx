import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField as FormFieldWrapper,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MultiSelect } from '@/components/ui/multi-select';

interface SelectOption {
  value: string;
  label: string;
}

interface FormMultiSelectProps {
  name: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  required?: boolean;
  hint?: string;
  maxCount?: number;
}

export function FormMultiSelect({ name, label, placeholder, options, maxCount, hint }: FormMultiSelectProps) {
  const form = useFormContext();
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <MultiSelect
                options={options}
                onValueChange={field.onChange}
                defaultValue={field.value || []}
                placeholder={placeholder}
                maxCount={maxCount}
              />
            </FormControl>
            {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
