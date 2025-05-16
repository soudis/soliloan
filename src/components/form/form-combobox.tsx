import type { UseFormReturn } from 'react-hook-form';

import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FormComboboxProps {
  form: UseFormReturn;
  name: string;
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  required?: boolean;
  disabled?: boolean;
}

export function FormCombobox({ form, name, label, placeholder, options, disabled = false }: FormComboboxProps) {
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Combobox
              options={options}
              value={field.value}
              onSelect={field.onChange}
              placeholder={placeholder}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
