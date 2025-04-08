import { FormControl, FormField as FormFieldWrapper, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UseFormReturn } from 'react-hook-form'

interface FormFieldProps {
  form: UseFormReturn<any>
  name: string
  label: string
  placeholder?: string
  type?: string
  multiline?: boolean
  required?: boolean
}

export function FormField({
  form,
  name,
  label,
  placeholder,
  type = 'text',
  multiline = false,
  required = false,
}: FormFieldProps) {
  return (
    <FormFieldWrapper
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea placeholder={placeholder} {...field} required={required} />
            ) : (
              <Input type={type} placeholder={placeholder} {...field} required={required} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
} 