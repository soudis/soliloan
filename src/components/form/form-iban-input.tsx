import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { splitIbanIntoGroups } from '@/lib/utils/iban';

interface FormIbanInputProps {
  name: string;
  label: string;
  placeholder?: string;
}

export function FormIbanInput({ name, label, placeholder }: FormIbanInputProps) {
  const form = useFormContext();

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = splitIbanIntoGroups(e.target.value).join(' ');
    form.setValue(name, formatted, { shouldValidate: true });
  };

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={placeholder}
              onChange={handleIbanChange}
              className={cn('font-mono', field.value && 'uppercase')}
              maxLength={34} // Maximum IBAN length is 34 characters
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
