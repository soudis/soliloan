'use client';

import { X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { Badge } from '@/components/ui/badge';
import {
  FormControl,
  FormDescription,
  FormField as FormFieldWrapper,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface FormChipInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  noItems?: string;
  hint?: string;
  required?: boolean;
}

export function FormChipInput({ name, label, placeholder, noItems, hint, required = false }: FormChipInputProps) {
  const form = useFormContext();
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const value = inputValue.trim();

    if (event.key === 'Enter' && value) {
      event.preventDefault();

      const currentValues = form.getValues(name) || [];

      // Only add if it doesn't already exist in the array
      if (!currentValues.includes(value)) {
        const newValues = [...currentValues, value];
        form.setValue(name, newValues, { shouldValidate: true });
      }

      setInputValue('');
    }
  };

  const removeChip = (chipToRemove: string) => {
    const currentValues = form.getValues(name) || [];
    const newValues = currentValues.filter((value: string) => value !== chipToRemove);
    form.setValue(name, newValues, { shouldValidate: true });
  };

  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                required={required}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value && field.value.length > 0 ? (
                  field.value.map((item: string) => (
                    <Badge key={item} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {item}
                      <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeChip(item)} />
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground/60 text-sm italic mx-2">{noItems}</p>
                )}
              </div>
            </div>
          </FormControl>
          {hint && <FormDescription className="text-sm text-muted-foreground/80">{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
