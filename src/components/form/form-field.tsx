import { useFormContext } from 'react-hook-form';

import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function FormField({
  name,
  label,
  placeholder,
  type = 'text',
  multiline = false,
  required = false,
  disabled = false,
}: FormFieldProps) {
  const form = useFormContext();
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            {multiline ? (
              <Textarea placeholder={placeholder} {...field} required={required} disabled={disabled} />
            ) : (
              <Input type={type} placeholder={placeholder} {...field} required={required} disabled={disabled} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
