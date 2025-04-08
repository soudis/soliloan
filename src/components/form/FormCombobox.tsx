import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { UseFormReturn } from 'react-hook-form'

interface FormComboboxProps {
  form: UseFormReturn<any>
  name: string
  label: string
  placeholder: string
  options: ComboboxOption[]
  required?: boolean
}

export function FormCombobox({
  form,
  name,
  label,
  placeholder,
  options,
  required = false,
}: FormComboboxProps) {
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
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
} 